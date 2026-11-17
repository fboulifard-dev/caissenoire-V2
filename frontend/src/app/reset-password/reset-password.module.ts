import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ResetPasswordPage } from './reset-password.page';
import { PasswordRequirementsComponent } from '../shared/password-requirements/password-requirements.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PasswordRequirementsComponent, RouterModule.forChild([{ path: '', component: ResetPasswordPage }])],
  declarations: [ResetPasswordPage]
})
export class ResetPasswordPageModule {}
