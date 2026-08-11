import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { isUniqueViolation } from '../common/database/postgres-error.util';
import { ApiException } from '../common/errors/api-exception';
import { AppConfigService } from '../config/app-config.service';
import { CodeGeneratorService } from './code-generator.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { DeleteResultDto, LinkResponseDto } from './dto/link-response.dto';
import { LinkSortField, ListLinksQueryDto } from './dto/list-links-query.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { Link } from './entities/link.entity';
import { toLinkResponseDto } from './mappers/link-response.mapper';

const MAX_ORIGINAL_URL_LENGTH = 2048;
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'];

/** `sort` в query — имя колонки БД (docs/api/contract.md §7), маппим на property энтити. */
const SORT_FIELD_TO_PROPERTY: Record<LinkSortField, 'createdAt' | 'clicksCount'> = {
  created_at: 'createdAt',
  clicks_count: 'clicksCount',
};

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link) private readonly linksRepository: Repository<Link>,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly config: AppConfigService,
  ) {}

  async create(dto: CreateLinkDto): Promise<LinkResponseDto> {
    this.validateOriginalUrl(dto.originalUrl);
    const title = dto.title ?? null;

    const link = dto.customCode
      ? await this.createWithCustomCode(dto.customCode, dto.originalUrl, title)
      : await this.createWithGeneratedCode(dto.originalUrl, title);

    return toLinkResponseDto(link, this.config.baseUrl);
  }

  async list(query: ListLinksQueryDto): Promise<PaginatedResult<LinkResponseDto>> {
    const qb = this.linksRepository.createQueryBuilder('link');

    if (query.search) {
      qb.andWhere('(link.title ILIKE :search OR link.code ILIKE :search OR link.originalUrl ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy(`link.${SORT_FIELD_TO_PROPERTY[query.sort]}`, query.order.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((link) => toLinkResponseDto(link, this.config.baseUrl)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async findOne(id: number): Promise<LinkResponseDto> {
    const link = await this.getEntityOrFail(id);
    return toLinkResponseDto(link, this.config.baseUrl);
  }

  async update(id: number, dto: UpdateLinkDto): Promise<LinkResponseDto> {
    const link = await this.getEntityOrFail(id);

    if (dto.originalUrl !== undefined) {
      this.validateOriginalUrl(dto.originalUrl);
      link.originalUrl = dto.originalUrl;
    }
    if (dto.title !== undefined) {
      link.title = dto.title;
    }
    if (dto.isActive !== undefined) {
      link.isActive = dto.isActive;
    }

    const saved = await this.linksRepository.save(link);
    return toLinkResponseDto(saved, this.config.baseUrl);
  }

  async remove(id: number): Promise<DeleteResultDto> {
    const link = await this.getEntityOrFail(id);
    // ON DELETE CASCADE на click_events.link_id (миграция T7) — удаляется на уровне БД.
    await this.linksRepository.remove(link);
    return { deleted: true };
  }

  /** Переиспользуется StatsService (T13) для проверки существования ссылки перед агрегатами. */
  async getEntityOrFail(id: number): Promise<Link> {
    const link = await this.linksRepository.findOneBy({ id });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, 'LINK_NOT_FOUND', `Link with id ${id} was not found`);
    }
    return link;
  }

  /** docs/api/contract.md §5: только http/https, ровно как прислали (без нормализации), ≤2048 символов. */
  private validateOriginalUrl(originalUrl: string): void {
    if (!originalUrl || originalUrl.length === 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        'originalUrl must not be empty',
      ]);
    }

    if (originalUrl.length > MAX_ORIGINAL_URL_LENGTH) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        `originalUrl must not exceed ${MAX_ORIGINAL_URL_LENGTH} characters`,
      ]);
    }

    let parsed: URL;
    try {
      parsed = new URL(originalUrl);
    } catch {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        'originalUrl must be a valid http(s) URL',
      ]);
    }

    if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', [
        'originalUrl must be a valid http(s) URL',
      ]);
    }
  }

  private async createWithCustomCode(customCode: string, originalUrl: string, title: string | null): Promise<Link> {
    this.codeGenerator.validateCustomCode(customCode);
    try {
      return await this.linksRepository.save(this.linksRepository.create({ code: customCode, originalUrl, title }));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiException(HttpStatus.CONFLICT, 'CODE_TAKEN', `Short code '${customCode}' is already in use`);
      }
      throw error;
    }
  }

  private async createWithGeneratedCode(originalUrl: string, title: string | null): Promise<Link> {
    let saved: Link | undefined;

    await this.codeGenerator.generateUniqueCode(async (code) => {
      saved = await this.linksRepository.save(this.linksRepository.create({ code, originalUrl, title }));
    });

    // generateUniqueCode либо резолвится после успешного insert (saved гарантированно
    // присвоен), либо бросает исключение — эта переменная сюда никогда не попадает пустой.
    return saved as Link;
  }
}
