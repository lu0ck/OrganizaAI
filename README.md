<div align="center">
  <img src="assets/readmelogo.png" alt="OrganizaAi Logo" width="400">
</div>

# OrganizaAi

**OrganizaAi** é o companheiro definitivo para motoristas de aplicativo e entregadores que buscam profissionalizar sua gestão financeira e operacional. Desenvolvido com foco em usabilidade e eficiência, o app permite o controle total de ganhos, despesas, metas e manutenção do veículo.

---

## ✨ Funcionalidades Principais

### 📊 Dashboard Inteligente
- **O que é:** Central de controle com visão geral do seu negócio.
- **Como usar:** Visualize seu lucro líquido real, desempenho por hora e por KM.
- **Novo:** Exibe o **Custo Fixo Mensal do Veículo** incluindo IPVA, licenciamento, seguro e parcela do veículo (se financiado).

### 📅 Agenda e Simulação
- **O que é:** Ferramenta de planejamento semanal.
- **Como usar:** Defina seus horários de trabalho e simule ganhos baseados no seu histórico. Ideal para saber quanto tempo você precisa trabalhar para bater sua meta.

### 📝 Lançamentos Diários
- **O que é:** Registro de ganhos diários.
- **Novo:** Cada lançamento agora exibe:
  - **Horas trabalhadas** no período
  - **Custo estimado de combustível** (baseado no preço do último abastecimento)

### 💰 Gestão de Despesas
- **O que é:** Controle de todos os gastos operacionais.
- **Novo:** Cada despesa mostra quantos **KM precisam ser rodados para pagar** aquela despesa (baseado na sua média de ganho por KM).

### 🎯 Metas Conectadas à Agenda
- **O que é:** Sistema de metas integrado com sua agenda de trabalho.
- **Como funciona:** Configure sua meta diária e conecte à sua agenda. O sistema calcula automaticamente quantos dias você deveria ter trabalhado e compara com seu ganho real.
- **Novo:** Exibe no Dashboard:
  - **Meta esperada** até hoje (baseada nos dias de trabalho configurados)
  - **Valor realizado** no período
  - **Status:** Acima da meta ou atrasado (com valor da diferença)
  - **Dias trabalhados** vs esperados

### ⛽ Calculadora de Combustível
- **O que é:** Comparador de eficiência entre Gasolina e Álcool.
- **Como usar:** Insira os preços e o consumo do seu veículo para saber instantaneamente qual combustível é mais vantajoso no momento.

### 🔧 Gestão de Manutenção
- **O que é:** Controle rigoroso da saúde do seu veículo.
- **Como usar:** Registre trocas de óleo, pneus e freios. O app avisa quando a manutenção está próxima. Use o botão **"Trocar Agora"** para registrar uma manutenção rápida ou **"Zerar Tudo"** ao iniciar um novo ciclo no veículo.

### 👤 Perfil do Veículo
- **Novo:** Adicione informações sobre a **parcela do veículo**:
  - Valor da parcela mensal
  - Quantidade de parcelas restantes
  - Total a pagar é exibido no Dashboard

### 📄 Relatórios Profissionais
- **O que é:** Exportação de dados para análise externa.
- **Como usar:** Gere arquivos em **PDF** ou **CSV** com o fechamento do seu mês. Útil para declaração de impostos ou controle financeiro detalhado.

### 💾 Segurança de Dados
- **O que é:** Sistema de backup e persistência.
- **Como usar:** O app salva tudo localmente. Toda semana você receberá um lembrete para exportar seu backup e garantir que não perderá nada.

---

## 📐 Documentação de Fórmulas

O OrganizaAi utiliza diversas fórmulas matemáticas para calcular consumo de combustível, métricas financeiras, previsões de manutenção e simulações de ganhos.

📚 **Consulte a documentação completa:** [Documentação de Fórmulas](assets/FORMULAS.md)

### Resumo das Fórmulas:

| Categoria | Principais Fórmulas |
|-----------|---------------------|
| **Combustível** | Método da Reserva, Consumo Real, Média Global, Autonomia |
| **Financeiras** | Lucro Líquido, Ganho por Hora/KM/Corrida, Custos Fixos Mensais |
| **Manutenção** | Progresso por KM/Dias, Dias Restantes, Previsão de Troca |
| **Metas** | Meta Esperada (Agenda), Diferença Real vs Esperado, Dias Trabalhados |
| **Simulação** | Projeção de Ganhos, Ratio de Despesas, Lucro Projetado |

---

## 📖 Tutorial Completo de Uso

1. **Configuração Inicial:** Ao abrir o app pela primeira vez, preencha seu perfil com o nome, modelo do veículo, consumo médio e configure sua agenda de trabalho.
2. **Lançando Ganhos:** Após cada turno, vá em **"Lançamentos"** e insira o valor total, KM rodado e a divisão por aplicativos (Uber, iFood, etc). O app calculará automaticamente as horas trabalhadas e o custo estimado de combustível.
3. **Registrando Gastos:** Insira todos os seus custos (combustível, lanches, taxas) em **"Despesas"**. O app mostrará quantos KM você precisa rodar para pagar cada despesa.
4. **Monitorando Metas:** Defina uma meta diária em **"Metas"**, conecte à sua agenda e acompanhe seu progresso em tempo real. O sistema mostra se você está acima ou atrasado da meta.
5. **Manutenção:** Sempre que trocar uma peça, clique em **"Trocar Agora"** no menu de Manutenção para reiniciar o contador de KM daquela peça.

---

## 🛠️ Instalação

### 🪟 Windows (.exe)
1. Baixe o arquivo `OrganizaAi-Setup.exe` da seção de releases.
2. Execute o instalador e siga as instruções na tela.
3. O atalho será criado na sua área de trabalho.

### 🐧 Linux (.AppImage)
1. Baixe o arquivo `OrganizaAi.AppImage`.
2. Clique com o botão direito no arquivo e vá em **Propriedades > Permissões**.
3. Marque a opção **"Permitir execução do arquivo como programa"**.
4. Dê um duplo clique para abrir.

---

## 🔧 Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS 4
- **Desktop:** Electron
- **Gráficos:** Recharts
- **PDF:** jsPDF + jsPDF-AutoTable
- **Ícones:** Lucide React
- **Animações:** Motion

---

## 👨‍💻 Desenvolvedor

Feito com 🤖 por **Lucas**.

- **GitHub:** [lu0ck](https://github.com/lu0ck)
- **LinkedIn:** [Lucas Paixão](https://www.linkedin.com/in/lucaspaixao-dev)
- **Portfólio:** [Lucas Dev](https://lucasdevport.netlify.app/#contato)

---

<div align="center">
  <i>OrganizaAi - O seu lucro, sob controle.</i>
</div>
