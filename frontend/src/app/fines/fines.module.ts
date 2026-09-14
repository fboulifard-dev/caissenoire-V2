import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FinesPage } from './fines.page';
import { FineCreatePage } from './fine-create.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild([
    { path: 'create', component: FineCreatePage },
    { path: ':seasonId/create', component: FineCreatePage },
    { path: 'edit/:fineId', component: FineCreatePage },
    { path: '', component: FinesPage },
    { path: ':seasonId', component: FinesPage }
  ])],
  declarations: [FinesPage, FineCreatePage]
})
export class FinesPageModule {}
