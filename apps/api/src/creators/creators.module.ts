import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';
import { CreatorOfferingsController } from './creator-offerings.controller';
import { CreatorAssignmentsController } from './creator-assignments.controller';
import { CreatorPayoutsController } from './creator-payouts.controller';
import { AdminCreatorsController } from './admin/admin-creators.controller';
import { AdminCreatorOfferingsController } from './admin/admin-creator-offerings.controller';
import { AdminOrderAssignmentsController } from './admin/admin-order-assignments.controller';
import { AdminPayoutsController } from './admin/admin-payouts.controller';
import { CreatorProfilesService } from './creator-profiles.service';
import { CreatorOfferingsService } from './creator-offerings.service';
import { OrderAssignmentsService } from './order-assignments.service';
import { CreatorEarningsService } from './creator-earnings.service';
import { CreatorPayoutsService } from './creator-payouts.service';

@Module({
  controllers: [
    CreatorsController,
    CreatorOfferingsController,
    CreatorAssignmentsController,
    CreatorPayoutsController,
    AdminCreatorsController,
    AdminCreatorOfferingsController,
    AdminOrderAssignmentsController,
    AdminPayoutsController,
  ],
  providers: [
    CreatorProfilesService,
    CreatorOfferingsService,
    OrderAssignmentsService,
    CreatorEarningsService,
    CreatorPayoutsService,
  ],
})
export class CreatorsModule {}
