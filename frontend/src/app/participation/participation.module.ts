import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ParticipationPage } from './participation.page';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [ParticipationPage],
  exports: [ParticipationPage]
})
export class ParticipationPageModule {}