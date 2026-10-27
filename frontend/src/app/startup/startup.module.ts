import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { StartupPage } from './startup.page';

@NgModule({
  declarations: [StartupPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: StartupPage }])]
})
export class StartupPageModule {}