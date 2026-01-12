import bcrypt from "bcryptjs";
import { db } from "./db";
import { branches, companies, customerIdentifiers, customers, locations, plans, products, services, users } from "./schema";

const demoCompanyId = "11111111-1111-1111-1111-111111111111";
const mainBranchId = "22222222-2222-2222-2222-222222222222";
const parkBranchId = "33333333-3333-3333-3333-333333333333";

const run = async () => {
  await db
    .insert(companies)
    .values({
      id: demoCompanyId,
      name: "Demo Tagflow",
      cnpj: "00.000.000/0001-00",
      plan: "Demo",
      status: "active",
      theme: "sunset"
    })
    .onConflictDoNothing();

  await db
    .insert(plans)
    .values([
      {
        name: "Free",
        description: "Entrada com limite basico.",
        priceMonthly: "0.00",
        currency: "brl",
        stripePriceId: null,
        features: JSON.stringify(["PDV basico", "Reservas essenciais", "Relatorios simples"]),
        limits: JSON.stringify(["1 filial", "1 operador", "100 clientes", "5 reservas/mes"]),
        active: true
      },
      {
        name: "Start",
        description: "Operacao inicial completa.",
        priceMonthly: "97.00",
        currency: "brl",
        stripePriceId: "price_1SoZ0HDGSJXgT11Uw5ymYOOf",
        features: JSON.stringify(["PDV completo", "NFC e codigo de barras", "Relatorios padrao"]),
        limits: JSON.stringify(["2 filiais", "5 operadores", "2.000 clientes"]),
        active: true
      },
      {
        name: "Growth",
        description: "Escala e recursos avancados.",
        priceMonthly: "197.00",
        currency: "brl",
        stripePriceId: "price_1SoZ0kDGSJXgT11U1ZkZx6Mb",
        features: JSON.stringify(["Divisao de contas", "Indicadores ao vivo", "Equipe dedicada"]),
        limits: JSON.stringify(["5 filiais", "15 operadores", "10.000 clientes"]),
        active: true
      },
      {
        name: "Enterprise",
        description: "Plano sob medida.",
        priceMonthly: "0.00",
        currency: "brl",
        stripePriceId: null,
        features: JSON.stringify(["Ambiente isolado", "SLA e auditoria", "Customizacoes"]),
        limits: JSON.stringify(["Filiais ilimitadas", "Usuarios ilimitados"]),
        active: true
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(branches)
    .values([
      {
        id: mainBranchId,
        companyId: demoCompanyId,
        name: "Tagflow Arena",
        address: "Av. Principal, 1200 - Centro",
        phone: "(11) 3333-0001",
        hours: "Seg-Dom 08:00-23:00"
      },
      {
        id: parkBranchId,
        companyId: demoCompanyId,
        name: "Tagflow Park",
        address: "Rua do Lazer, 45 - Jardim",
        phone: "(11) 3333-0002",
        hours: "Qua-Seg 10:00-21:00"
      }
    ])
    .onConflictDoNothing();

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values([
      {
        companyId: demoCompanyId,
        name: "Admin Demo",
        email: "admin@tagflow.local",
        passwordHash,
        role: "super_admin"
      },
      {
        companyId: demoCompanyId,
        name: "Super Admin",
        email: "superadmin@tagflow.local",
        passwordHash,
        role: "super_admin"
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customers)
    .values([
      {
        id: "c0000000-0000-0000-0000-000000000001",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Carlos Silva",
        cpf: "123.456.789-00",
        birthDate: "1988-04-12",
        phone: "11999990001",
        email: "carlos@demo.local",
        credits: "120.00",
        creditLimit: "300.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000002",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Fernanda Costa",
        cpf: "987.654.321-00",
        birthDate: "1992-11-30",
        phone: "11999990002",
        email: "fernanda@demo.local",
        credits: "40.00",
        creditLimit: "150.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000003",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Joao Pereira",
        cpf: "111.222.333-44",
        birthDate: "1985-02-20",
        phone: "11999990003",
        email: "joao@demo.local",
        credits: "0.00",
        creditLimit: "200.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000004",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Marina Rocha",
        cpf: "222.333.444-55",
        birthDate: "1995-06-18",
        phone: "11999990004",
        email: "marina@demo.local",
        credits: "85.00",
        creditLimit: "250.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000005",
        companyId: demoCompanyId,
        branchId: parkBranchId,
        name: "Bruno Almeida",
        cpf: "333.444.555-66",
        birthDate: "1990-01-05",
        phone: "11999990005",
        email: "bruno@demo.local",
        credits: "30.00",
        creditLimit: "100.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000006",
        companyId: demoCompanyId,
        branchId: parkBranchId,
        name: "Larissa Gomes",
        cpf: "444.555.666-77",
        birthDate: "1997-09-09",
        phone: "11999990006",
        email: "larissa@demo.local",
        credits: "60.00",
        creditLimit: "180.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000007",
        companyId: demoCompanyId,
        branchId: parkBranchId,
        name: "Diego Moreira",
        cpf: "555.666.777-88",
        birthDate: "1983-07-28",
        phone: "11999990007",
        email: "diego@demo.local",
        credits: "10.00",
        creditLimit: "120.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000008",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Renata Souza",
        cpf: "666.777.888-99",
        birthDate: "1989-12-02",
        phone: "11999990008",
        email: "renata@demo.local",
        credits: "200.00",
        creditLimit: "400.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000009",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Andre Lima",
        cpf: "777.888.999-00",
        birthDate: "1991-03-23",
        phone: "11999990009",
        email: "andre@demo.local",
        credits: "25.00",
        creditLimit: "90.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000010",
        companyId: demoCompanyId,
        branchId: parkBranchId,
        name: "Paula Mendes",
        cpf: "888.999.000-11",
        birthDate: "1994-05-15",
        phone: "11999990010",
        email: "paula@demo.local",
        credits: "75.00",
        creditLimit: "220.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000011",
        companyId: demoCompanyId,
        branchId: mainBranchId,
        name: "Rafael Barreto",
        cpf: "999.000.111-22",
        birthDate: "1987-08-11",
        phone: "11999990011",
        email: "rafael@demo.local",
        credits: "15.00",
        creditLimit: "110.00"
      },
      {
        id: "c0000000-0000-0000-0000-000000000012",
        companyId: demoCompanyId,
        branchId: parkBranchId,
        name: "Camila Nunes",
        cpf: "000.111.222-33",
        birthDate: "1998-10-19",
        phone: "11999990012",
        email: "camila@demo.local",
        credits: "55.00",
        creditLimit: "160.00"
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customerIdentifiers)
    .values([
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000001", type: "nfc", code: "NFC1001", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000002", type: "barcode", code: "BAR2001", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000003", type: "manual", code: "MAN3001", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000004", type: "nfc", code: "NFC1002", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000005", type: "barcode", code: "BAR2002", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000006", type: "manual", code: "MAN3002", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000007", type: "nfc", code: "NFC1003", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000008", type: "barcode", code: "BAR2003", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000009", type: "manual", code: "MAN3003", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000010", type: "nfc", code: "NFC1004", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000011", type: "barcode", code: "BAR2004", isMaster: true },
      { companyId: demoCompanyId, customerId: "c0000000-0000-0000-0000-000000000012", type: "manual", code: "MAN3004", isMaster: true }
    ])
    .onConflictDoNothing();

  await db
    .insert(products)
    .values([
      { companyId: demoCompanyId, name: "Agua mineral 500ml", description: "Garrafa sem gas", price: "6.00", category: "Bebidas", stock: 200, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Agua com gas 500ml", description: "Garrafa com gas", price: "7.00", category: "Bebidas", stock: 180, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Refrigerante lata", description: "350ml", price: "8.00", category: "Bebidas", stock: 240, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Energetico 250ml", description: "Lata tradicional", price: "12.00", category: "Bebidas", stock: 120, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Suco natural 300ml", description: "Laranja ou limao", price: "10.00", category: "Bebidas", stock: 80, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Cafe espresso", description: "Dose unica", price: "7.50", category: "Bebidas", stock: 100, active: true },
      { companyId: demoCompanyId, name: "Cerveja long neck", description: "600ml", price: "15.00", category: "Bebidas", stock: 140, active: true, imageUrl: "/logo-tagflow.png" },
      { companyId: demoCompanyId, name: "Porcao batata frita", description: "300g", price: "28.00", category: "Lanches", stock: 60, active: true },
      { companyId: demoCompanyId, name: "Porcao anel de cebola", description: "250g", price: "26.00", category: "Lanches", stock: 50, active: true },
      { companyId: demoCompanyId, name: "Hamburguer artesanal", description: "Pao brioche e queijo", price: "32.00", category: "Lanches", stock: 80, active: true },
      { companyId: demoCompanyId, name: "Hot dog especial", description: "Pao, salsicha e molho", price: "18.00", category: "Lanches", stock: 90, active: true },
      { companyId: demoCompanyId, name: "Salada de frutas", description: "Pote 300g", price: "16.00", category: "Sobremesas", stock: 70, active: true },
      { companyId: demoCompanyId, name: "Sorvete casquinha", description: "Chocolate ou baunilha", price: "9.00", category: "Sobremesas", stock: 200, active: true },
      { companyId: demoCompanyId, name: "Pizza individual", description: "Mussarela 25cm", price: "34.00", category: "Lanches", stock: 40, active: true },
      { companyId: demoCompanyId, name: "Sanduiche natural", description: "Frango com cream cheese", price: "22.00", category: "Lanches", stock: 70, active: true },
      { companyId: demoCompanyId, name: "Combo kids", description: "Suco + lanche infantil", price: "25.00", category: "Combos", stock: 50, active: true },
      { companyId: demoCompanyId, name: "Agua de coco", description: "330ml", price: "11.00", category: "Bebidas", stock: 60, active: true },
      { companyId: demoCompanyId, name: "Isotonico", description: "500ml", price: "12.50", category: "Bebidas", stock: 100, active: true },
      { companyId: demoCompanyId, name: "Kit churrasco", description: "Carne e acompanhamentos", price: "85.00", category: "Especiais", stock: 20, active: true },
      { companyId: demoCompanyId, name: "Porcao de frango", description: "400g", price: "38.00", category: "Lanches", stock: 35, active: true }
    ])
    .onConflictDoNothing();

  await db
    .insert(services)
    .values([
      { companyId: demoCompanyId, name: "Aluguel de armario", description: "Armario individual com chave", price: "10.00", unit: "dia", active: true },
      { companyId: demoCompanyId, name: "Aluguel de churrasqueira", description: "Area coberta com pia", price: "120.00", unit: "periodo", active: true },
      { companyId: demoCompanyId, name: "Aula de beach tennis", description: "Turma iniciante", price: "55.00", unit: "hora", active: true },
      { companyId: demoCompanyId, name: "Aula de futsal", description: "Treino coletivo", price: "60.00", unit: "hora", active: true },
      { companyId: demoCompanyId, name: "Pacote aniversario", description: "Decoracao e monitoria", price: "850.00", unit: "evento", active: true },
      { companyId: demoCompanyId, name: "Monitoria infantil", description: "Recreacao guiada", price: "90.00", unit: "hora", active: true },
      { companyId: demoCompanyId, name: "Area VIP", description: "Mesa e atendimento dedicado", price: "150.00", unit: "periodo", active: true },
      { companyId: demoCompanyId, name: "Passe diario parque", description: "Acesso a atracoes", price: "120.00", unit: "dia", active: true },
      { companyId: demoCompanyId, name: "Passe infantil", description: "Criancas ate 12 anos", price: "80.00", unit: "dia", active: true },
      { companyId: demoCompanyId, name: "Translado interno", description: "Carrinho eletrico", price: "15.00", unit: "viagem", active: true }
    ])
    .onConflictDoNothing();

  await db
    .insert(locations)
    .values([
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Quadra 1", type: "quadra", capacity: 8, price: "160.00", priceUnit: "hour", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Quadra 2", type: "quadra", capacity: 8, price: "160.00", priceUnit: "hour", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Campo society", type: "campo", capacity: 12, price: "220.00", priceUnit: "hour", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Mesa 01", type: "mesa", capacity: 4, price: "30.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Mesa 02", type: "mesa", capacity: 4, price: "30.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Sala VIP 01", type: "sala", capacity: 12, price: "350.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: parkBranchId, name: "Brinquedo radical", type: "atracao", capacity: 2, price: "25.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: parkBranchId, name: "Roda gigante", type: "atracao", capacity: 6, price: "20.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: parkBranchId, name: "Area picnic", type: "espaco", capacity: 20, price: "120.00", priceUnit: "day", active: true },
      { companyId: demoCompanyId, branchId: parkBranchId, name: "Salas de festa", type: "sala", capacity: 30, price: "900.00", priceUnit: "period", active: true },
      { companyId: demoCompanyId, branchId: parkBranchId, name: "Espaco corporativo", type: "sala", capacity: 50, price: "2500.00", priceUnit: "day", active: true },
      { companyId: demoCompanyId, branchId: mainBranchId, name: "Sala de reuniao", type: "sala", capacity: 10, price: "140.00", priceUnit: "hour", active: true }
    ])
    .onConflictDoNothing();

  console.log("Seed completed");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
