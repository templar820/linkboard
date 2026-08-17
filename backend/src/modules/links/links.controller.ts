import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { LinksService } from './links.service';

/** Явный путь 'api/links' — см. решение по маршрутизации в src/main.ts / backend/CLAUDE.md. */
@Controller('api/links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto) {
    return this.linksService.create(dto);
  }

  @Get()
  list(@Query() query: ListLinksQueryDto) {
    return this.linksService.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.linksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateLinkDto) {
    return this.linksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.linksService.remove(id);
  }
}
