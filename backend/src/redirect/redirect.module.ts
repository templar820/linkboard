import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from '../links/entities/link.entity';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  controllers: [RedirectController],
  providers: [RedirectService],
})
export class RedirectModule {}
