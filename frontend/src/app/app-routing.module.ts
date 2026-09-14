import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'saisons',
    loadChildren: () => import('./seasons/seasons.module').then(m => m.SeasonsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId/paiements',
    loadChildren: () => import('./payments/payments.module').then(m => m.PaymentsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId/amendes',
    loadChildren: () => import('./fines/fines.module').then(m => m.FinesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId/regles',
    loadChildren: () => import('./rules/rules.module').then(m => m.RulesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId/joueurs',
    loadChildren: () => import('./players/players.module').then(m => m.PlayersPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId/classement',
    loadChildren: () => import('./ranking/ranking.module').then(m => m.RankingPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'saisons/:seasonId',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'fines',
    loadChildren: () => import('./fines/fines.module').then(m => m.FinesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'payments',
    loadChildren: () => import('./payments/payments.module').then(m => m.PaymentsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'ranking',
    loadChildren: () => import('./ranking/ranking.module').then(m => m.RankingPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
