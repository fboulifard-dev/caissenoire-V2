import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PaymentsPage } from './payments.page';
import { PaymentCreatePage } from './payment-create.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      { path: ':seasonId/create', component: PaymentCreatePage },
      { path: 'create', component: PaymentCreatePage },
      { path: 'edit/:paymentId', component: PaymentCreatePage },
      { path: '', component: PaymentsPage },
      { path: ':seasonId', component: PaymentsPage },
    ])
  ],
  declarations: [PaymentsPage, PaymentCreatePage]
})
export class PaymentsPageModule {}
