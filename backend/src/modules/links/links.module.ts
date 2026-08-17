import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeGeneratorService } from './code-generator.service';
import { Link } from './entities/link.entity';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  controllers: [LinksController],
  providers: [LinksService, CodeGeneratorService],
  // LinksService переиспользуется StatsModule (T13: проверка существования ссылки перед
  // агрегатами) и в дальнейшем RedirectModule (T12).
  exports: [LinksService],
})
export class LinksModule {}
