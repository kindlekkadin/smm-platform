import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/public-user';
import { CreatorOfferingsService } from './creator-offerings.service';
import { CreateCreatorOfferingDto } from './dto/create-creator-offering.dto';
import { UpdateCreatorOfferingDto } from './dto/update-creator-offering.dto';

@Controller('api/creators/offerings')
@UseGuards(JwtAuthGuard)
export class CreatorOfferingsController {
  constructor(private readonly offerings: CreatorOfferingsService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCreatorOfferingDto) {
    const offering = await this.offerings.create(user.id, dto);
    return { offering };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const offerings = await this.offerings.listOwn(user.id);
    return { offerings };
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const offering = await this.offerings.getOwn(user.id, id);
    return { offering };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCreatorOfferingDto,
  ) {
    const offering = await this.offerings.update(user.id, id, dto);
    return { offering };
  }
}
