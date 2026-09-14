import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { RulesPage } from './rules.page';
import { RuleCreatePage } from './rule-create.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild([
    { path: 'create', component: RuleCreatePage },
    { path: '', component: RulesPage }
  ])],
  declarations: [RulesPage, RuleCreatePage]
})
export class RulesPageModule {}
