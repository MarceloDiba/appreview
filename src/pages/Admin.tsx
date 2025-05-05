
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data
const adminData = {
  totalUsers: 128,
  activeSubscriptions: 94,
  revenueMonthly: 2340.60,
  newUsersThisMonth: 17,
  users: [
    { id: 'user1', name: 'Restaurante Pizzaria Bella', plan: 'standard', status: 'active', joined: '2023-03-15' },
    { id: 'user2', name: 'Salão de Beleza Glamour', plan: 'standard', status: 'active', joined: '2023-02-28' },
    { id: 'user3', name: 'Clínica Estética Renova', plan: 'standard', status: 'inactive', joined: '2023-04-05' },
    { id: 'user4', name: 'Bar do João', plan: 'standard', status: 'active', joined: '2023-01-10' },
    { id: 'user5', name: 'Hotel Paraíso', plan: 'standard', status: 'trial', joined: '2023-05-01' }
  ],
  recentPayments: [
    { id: 'pay1', business: 'Restaurante Pizzaria Bella', amount: 24.90, date: '2023-05-01', status: 'completed' },
    { id: 'pay2', business: 'Salão de Beleza Glamour', amount: 24.90, date: '2023-05-01', status: 'completed' },
    { id: 'pay3', business: 'Bar do João', amount: 24.90, date: '2023-05-01', status: 'completed' },
    { id: 'pay4', business: 'Hotel Paraíso', amount: 0, date: '2023-05-01', status: 'trial' },
    { id: 'pay5', business: 'Clínica Estética Renova', amount: 24.90, date: '2023-04-01', status: 'failed' }
  ]
};

const Admin = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="admin" />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Administração</h1>
            <p className="text-gray-600 mt-1">
              Gerencie usuários, planos e acompanhe métricas da plataforma.
            </p>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminData.totalUsers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Assinaturas Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminData.activeSubscriptions}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((adminData.activeSubscriptions / adminData.totalUsers) * 100)}% do total
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{adminData.revenueMonthly.toFixed(2)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Novos Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminData.newUsersThisMonth}</div>
                <div className="text-xs text-gray-500 mt-1">Este mês</div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="finances">Finanças</TabsTrigger>
              <TabsTrigger value="analytics">Estatísticas</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>
                      Gerencie os negócios cadastrados na plataforma.
                    </CardDescription>
                  </div>
                  <Button size="sm">Adicionar Usuário</Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Negócio</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data de Cadastro</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminData.users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell className="capitalize">{user.plan}</TableCell>
                            <TableCell>
                              <span 
                                className={`px-2 py-1 text-xs rounded-full ${
                                  user.status === 'active' ? 'bg-green-100 text-green-800' :
                                  user.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {user.status === 'active' ? 'Ativo' :
                                 user.status === 'trial' ? 'Trial' :
                                 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(user.joined).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/admin/users/${user.id}`}>Ver</Link>
                              </Button>
                              <Button variant="outline" size="sm" className="ml-2">
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="finances">
              <Card>
                <CardHeader>
                  <CardTitle>Finanças</CardTitle>
                  <CardDescription>
                    Acompanhe pagamentos e gerenciamento financeiro.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Negócio</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminData.recentPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.business}</TableCell>
                            <TableCell>
                              {payment.status === 'trial' ? 
                                'Trial' : `€${payment.amount.toFixed(2)}`
                              }
                            </TableCell>
                            <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <span 
                                className={`px-2 py-1 text-xs rounded-full ${
                                  payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {payment.status === 'completed' ? 'Concluído' :
                                 payment.status === 'trial' ? 'Trial' :
                                 'Falha'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas da Plataforma</CardTitle>
                  <CardDescription>
                    Visão geral das métricas e tendências da plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border border-dashed rounded-md bg-gray-50 text-gray-500">
                    Gráficos de estatísticas estarão disponíveis aqui.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Sistema de Notificações</CardTitle>
                  <CardDescription>
                    Configure alertas e notificações para usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">Alerta de Avaliação Negativa</h3>
                        <p className="text-sm text-gray-500">Notifica quando uma nova avaliação negativa é registrada.</p>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="negative-review" className="mr-2" checked />
                        <label htmlFor="negative-review">Ativo</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">Lembrete de Pagamento</h3>
                        <p className="text-sm text-gray-500">Envia lembrete 3 dias antes do vencimento.</p>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="payment-reminder" className="mr-2" checked />
                        <label htmlFor="payment-reminder">Ativo</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">Relatório Semanal</h3>
                        <p className="text-sm text-gray-500">Envia um resumo semanal de métricas para os usuários.</p>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="weekly-report" className="mr-2" />
                        <label htmlFor="weekly-report">Ativo</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">Notificação de Fim de Trial</h3>
                        <p className="text-sm text-gray-500">Avisa quando um período de trial está chegando ao fim.</p>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="trial-end" className="mr-2" checked />
                        <label htmlFor="trial-end">Ativo</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
