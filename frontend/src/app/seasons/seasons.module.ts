import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SeasonsPage } from './seasons.page';
import { ParticipationPageModule } from '../participation/participation.module';

@NgModule({
  imports: [CommonModule, IonicModule, ParticipationPageModule, RouterModule.forChild([{ path: '', component: SeasonsPage }])],
  declarations: [SeasonsPage]
})
export class SeasonsPageModule {}
