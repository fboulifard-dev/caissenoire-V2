import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SeasonsPage } from './seasons.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: SeasonsPage }])],
  declarations: [SeasonsPage]
})
export class SeasonsPageModule {}
