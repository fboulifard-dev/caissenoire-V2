import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { StatisticsPage } from './statistics.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: StatisticsPage }])
  ],
  declarations: [StatisticsPage]
})
export class StatisticsPageModule {}