# Documentação de Fórmulas - OrganizaAi

Este documento apresenta todas as fórmulas matemáticas utilizadas pelo OrganizaAi para calcular consumo de combustível, métricas financeiras, previsões de manutenção e simulações de ganhos.

---

## Sumário

1. [Fórmulas de Combustível (Método da Reserva)](#1-fórmulas-de-combustível-método-da-reserva)
2. [Fórmulas Financeiras](#2-fórmulas-financeiras)
3. [Fórmulas de Manutenção](#3-fórmulas-de-manutenção)
4. [Fórmulas de Simulação](#4-fórmulas-de-simulação)

---

## 1. Fórmulas de Combustível (Método da Reserva)

O Método da Reserva é uma técnica para calcular o consumo real de combustível sem precisar abastecer sempre o tanque cheio. Ele funciona monitorando quando você entra na reserva (luz do painel acende) para "calibrar" o cálculo.

### 1.1 Distância Útil

**Fórmula:**
```
Dútil = Dtotal - Dreserva
```

**Descrição:**  
Calcula a distância efetivamente percorrida excluindo os quilômetros rodados na reserva.

**Variáveis:**
- `Dútil`: Distância útil percorrida (km)
- `Dtotal`: Distância total percorrida desde o último abastecimento (km)
- `Dreserva`: Distância percorrida com a luz da reserva acesa (km)

**Explicação:**  
Quando você abastece, informa quantos km rodou no total desde o último abastecimento. Se você entrou na reserva (a luz acendeu), precisa informar quantos km rodou nela. A distância útil é o que realmente interessa para calcular o consumo, pois representa os km rodados com combustível "normal" do tanque.

**Exemplo:**
```
Dtotal = 350 km
Dreserva = 30 km

Dútil = 350 - 30 = 320 km
```

---

### 1.2 Consumo do Trecho (Calibrado)

**Fórmula:**
```
C = Dútil / (SaldoAnterior - Reserva)
```

**Descrição:**  
Calcula o consumo real em km/l quando o motorista entrou na reserva. Este é o cenário mais preciso, pois temos uma "calibração física" do tanque.

**Variáveis:**
- `C`: Consumo do trecho (km/l)
- `Dútil`: Distância útil percorrida (km)
- `SaldoAnterior`: Litros que havia no tanque antes de começar o trecho
- `Reserva`: Capacidade da reserva do tanque (configurada no perfil)

**Explicação:**  
Quando a luz da reserva acende, sabemos exatamente quanto combustível resta no tanque (apenas a reserva). Isso permite calcular com precisão quanto combustível foi queimado: `SaldoAnterior - Reserva`. Dividindo a distância útil pelo combustível queimado, obtemos o consumo real.

**Exemplo:**
```
Dútil = 320 km
SaldoAnterior = 12 litros
Reserva = 5 litros

Combustível queimado = 12 - 5 = 7 litros
C = 320 / 7 = 45,7 km/l
```

---

### 1.3 Consumo do Trecho (Estimado)

**Fórmula:**
```
C = Cref (média de referência anterior)
```

**Descrição:**  
Quando NÃO se entra na reserva, não temos uma calibração física. Neste caso, usamos a média de consumo do trecho anterior como estimativa.

**Variáveis:**
- `C`: Consumo do trecho (km/l)
- `Cref`: Média de referência (consumo do trecho anterior ou configurado no perfil)

**Explicação:**  
Se você abasteceu antes de entrar na reserva, não sabemos exatamente quanto combustível havia no tanque. O sistema então assume que seu consumo foi similar ao trecho anterior. Quanto mais trechos calibrados você tiver, mais precisa será essa estimativa.

**Exemplo:**
```
Cref = 42 km/l (média do trecho anterior)
C = 42 km/l (valor estimado)
```

---

### 1.4 Saldo Antes de Abastecer

**Fórmula:**
```
Santes = Santerior - (Dtotal / C)
```

**Descrição:**  
Calcula quantos litros restavam no tanque imediatamente antes de abastecer.

**Variáveis:**
- `Santes`: Saldo antes de abastecer (litros)
- `Santerior`: Saldo após o último abastecimento (litros)
- `Dtotal`: Distância total percorrida (km)
- `C`: Consumo do trecho (km/l)

**Explicação:**  
O saldo anterior é quanto você tinha após o último abastecimento. Dividindo a distância total pelo consumo, descobrimos quantos litros foram queimados. Subtraindo do saldo anterior, obtemos quanto restava antes de abastecer.

**Exemplo:**
```
Santerior = 12 litros
Dtotal = 350 km
C = 40 km/l

Combustível queimado = 350 / 40 = 8,75 litros
Santes = 12 - 8,75 = 3,25 litros
```

---

### 1.5 Saldo Final (Após Abastecer)

**Fórmula:**
```
Sfinal = min(Santes + Litros, CapacidadeTotal)
```

**Descrição:**  
Calcula quantos litros há no tanque após o abastecimento. Nunca pode exceder a capacidade total do tanque.

**Variáveis:**
- `Sfinal`: Saldo final após abastecer (litros)
- `Santes`: Saldo antes de abastecer (litros)
- `Litros`: Litros abastecidos
- `CapacidadeTotal`: Capacidade máxima do tanque (configurada no perfil)

**Explicação:**  
Soma-se o saldo anterior aos litros abastecidos. Se o resultado exceder a capacidade do tanque, o valor é limitado à capacidade máxima. Isso corrige imprecisões do saldo anterior quando o motorista abastece "até a boca".

**Exemplo:**
```
Santes = 3,25 litros
Litros = 10 litros
CapacidadeTotal = 15 litros

Sfinal = min(3,25 + 10, 15) = min(13,25, 15) = 13,25 litros
```

---

### 1.6 Média Global de Consumo

**Fórmula:**
```
Mg = ΣDtotal / (ΣLitros - Sfinal_atual)
```

**Descrição:**  
Calcula a média global de consumo considerando todos os abastecimentos e o saldo atual no tanque.

**Variáveis:**
- `Mg`: Média global de consumo (km/l)
- `ΣDtotal`: Soma de todas as distâncias percorridas
- `ΣLitros`: Soma de todos os litros abastecidos
- `Sfinal_atual`: Saldo atual no tanque (litros)

**Explicação:**  
Esta fórmula é a mais precisa para calcular o consumo real. Ao invés de simplesmente dividir km por litros abastecidos (que seria errado), subtraímos o saldo atual do total de litros. Assim, calculamos apenas os litros que foram **realmente queimados**.

**Exemplo:**
```
ΣDtotal = 2500 km (total de km rodados)
ΣLitros = 60 litros (total abastecido)
Sfinal_atual = 8 litros (saldo no tanque)

Litros queimados = 60 - 8 = 52 litros
Mg = 2500 / 52 = 48,1 km/l
```

---

### 1.7 Autonomia Restante

**Fórmula:**
```
KmAutonomia = Saldo × Cmédio
```

**Descrição:**  
Calcula quantos quilômetros você ainda pode percorrer com o combustível restante no tanque.

**Variáveis:**
- `KmAutonomia`: KM de autonomia restante
- `Saldo`: Litros no tanque
- `Cmédio`: Consumo médio (km/l)

**Explicação:**  
Multiplica o saldo atual pelo consumo médio para estimar quantos km ainda podem ser percorridos antes de ficar sem combustível.

**Exemplo:**
```
Saldo = 8 litros
Cmédio = 45 km/l

KmAutonomia = 8 × 45 = 360 km
```

---

### 1.8 Custo por KM (Veículo)

**Fórmula:**
```
CustoKM = (Combustível + Manutenção) / KM rodados
```

**Descrição:**  
Calcula quanto custa, em média, rodar cada quilômetro com o veículo.

**Variáveis:**
- `CustoKM`: Custo por quilômetro (R$/km)
- `Combustível`: Total gasto com combustível (R$)
- `Manutenção`: Total gasto com manutenção (R$)
- `KM rodados`: Total de quilômetros percorridos

**Explicação:**  
Soma todos os gastos relacionados ao veículo (combustível e manutenção) e divide pelo total de km rodados. Útil para saber o custo real de operação.

**Exemplo:**
```
Combustível = R$ 450,00
Manutenção = R$ 150,00
KM rodados = 3000 km

CustoKM = (450 + 150) / 3000 = R$ 0,20/km
```

---

## 2. Fórmulas Financeiras

### 2.1 Lucro Líquido

**Fórmula:**
```
Líquido = Ganhos - DespesasVariáveis - CustosFixos
```

**Descrição:**  
Calcula o lucro real descontando todas as despesas e custos fixos.

**Variáveis:**
- `Líquido`: Lucro líquido (R$)
- `Ganhos`: Total de ganhos brutos (R$)
- `DespesasVariáveis`: Despesas operacionais (combustível, alimentação, etc)
- `CustosFixos`: Custos fixos proporcionais ao período (IPVA, seguro, licenciamento)

**Explicação:**  
O lucro líquido é o que sobra após descontar tudo que foi gasto. Os custos fixos são rateados proporcionalmente ao período analisado.

**Exemplo:**
```
Ganhos = R$ 3000,00
DespesasVariáveis = R$ 800,00
CustosFixos = R$ 150,00 (proporcional ao mês)

Líquido = 3000 - 800 - 150 = R$ 2050,00
```

---

### 2.2 Custos Fixos Diários

**Fórmula:**
```
CustoDiário = (IPVA + Licenciamento) / 365 + Seguro / 30
```

**Descrição:**  
Calcula o custo fixo diário do veículo, rateando custos anuais e mensais.

**Variáveis:**
- `CustoDiário`: Custo fixo por dia (R$)
- `IPVA`: Valor anual do IPVA (R$)
- `Licenciamento`: Valor anual do licenciamento (R$)
- `Seguro`: Valor mensal do seguro (R$)

**Explicação:**  
IPVA e licenciamento são custos anuais, então dividimos por 365 dias. O seguro é mensal, então dividimos por 30 dias. Somando tudo, temos quanto custa manter o veículo parado por dia.

**Exemplo:**
```
IPVA = R$ 730,00/ano
Licenciamento = R$ 182,50/ano
Seguro = R$ 120,00/mês

CustoDiário = (730 + 182,50) / 365 + 120 / 30
CustoDiário = 2,50 + 4,00 = R$ 6,50/dia
```

---

### 2.3 Ganho por Hora

**Fórmula:**
```
GanhoHora = Ganhos totais / Horas trabalhadas
```

**Descrição:**  
Calcula quanto você ganha, em média, por hora trabalhada.

**Variáveis:**
- `GanhoHora`: Ganho por hora (R$/h)
- `Ganhos totais`: Soma de todos os ganhos (R$)
- `Horas trabalhadas`: Total de horas trabalhadas

**Explicação:**  
Divide o total ganho pelo total de horas trabalhadas. Importante para avaliar a eficiência do tempo de trabalho.

**Exemplo:**
```
Ganhos totais = R$ 1500,00
Horas trabalhadas = 40 horas

GanhoHora = 1500 / 40 = R$ 37,50/h
```

---

### 2.4 Ganho por KM

**Fórmula:**
```
GanhoKM = Ganhos totais / KM rodados
```

**Descrição:**  
Calcula quanto você ganha, em média, por quilômetro rodado.

**Variáveis:**
- `GanhoKM`: Ganho por KM (R$/km)
- `Ganhos totais`: Soma de todos os ganhos (R$)
- `KM rodados`: Total de quilômetros percorridos

**Explicação:**  
Divide o total ganho pelo total de km rodados. Útil para comparar com o custo por km e saber a margem de lucro real.

**Exemplo:**
```
Ganhos totais = R$ 1500,00
KM rodados = 500 km

GanhoKM = 1500 / 500 = R$ 3,00/km
```

---

### 2.5 Ganho por Corrida

**Fórmula:**
```
GanhoCorrida = Ganhos totais / Número de corridas
```

**Descrição:**  
Calcula quanto você ganha, em média, por corrida realizada.

**Variáveis:**
- `GanhoCorrida`: Ganho por corrida (R$)
- `Ganhos totais`: Soma de todos os ganhos (R$)
- `Número de corridas`: Total de corridas realizadas

**Explicação:**  
Divide o total ganho pelo número de corridas. Útil para avaliar o ticket médio das corridas.

**Exemplo:**
```
Ganhos totais = R$ 1500,00
Número de corridas = 120

GanhoCorrida = 1500 / 120 = R$ 12,50/corrida
```

---

### 2.6 Custo por KM (Financeiro)

**Fórmula:**
```
CustoKM = Custos totais do período / KM do período
```

**Descrição:**  
Calcula o custo operacional por quilômetro, incluindo todas as despesas e custos fixos.

**Variáveis:**
- `CustoKM`: Custo por KM (R$/km)
- `Custos totais`: Soma de despesas variáveis + custos fixos do período (R$)
- `KM do período`: Quilômetros rodados no período

**Explicação:**  
Divide todos os custos do período pelos km rodados. Comparando com o ganho por km, você sabe quanto sobra por km.

**Exemplo:**
```
Custos totais = R$ 600,00
KM do período = 1000 km

CustoKM = 600 / 1000 = R$ 0,60/km
```

---

## 3. Fórmulas de Manutenção

### 3.1 KM Desde Última Troca

**Fórmula:**
```
KMSince = KM_atual - KM_última_troca
```

**Descrição:**  
Calcula quantos quilômetros se passaram desde a última manutenção do item.

**Variáveis:**
- `KMSince`: KM percorridos desde a troca
- `KM_atual`: Quilometragem atual do veículo
- `KM_última_troca`: Quilometragem quando foi feita a última troca

**Explicação:**  
Subtrai a quilometragem da última troca da quilometragem atual. Isso mostra quantos km o item já rodou.

**Exemplo:**
```
KM_atual = 63500 km
KM_última_troca = 62500 km

KMSince = 63500 - 62500 = 1000 km
```

---

### 3.2 Progresso por KM

**Fórmula:**
```
ProgressoKM = (KMSince / IntervaloKM) × 100
```

**Descrição:**  
Calcula em porcentagem quanto do intervalo de manutenção já foi percorrido.

**Variáveis:**
- `ProgressoKM`: Porcentagem de progresso por KM (%)
- `KMSince`: KM percorridos desde a troca
- `IntervaloKM`: Intervalo de manutenção em KM (ex: a cada 1000 km)

**Explicação:**  
Divide os km percorridos pelo intervalo e multiplica por 100. Resultados acima de 100% indicam que a manutenção está atrasada.

**Exemplo:**
```
KMSince = 800 km
IntervaloKM = 1000 km

ProgressoKM = (800 / 1000) × 100 = 80%
```

---

### 3.3 Progresso por Dias

**Fórmula:**
```
ProgressoDias = (DiasSince / IntervaloDias) × 100
```

**Descrição:**  
Calcula em porcentagem quanto do intervalo de tempo já passou desde a última troca.

**Variáveis:**
- `ProgressoDias`: Porcentagem de progresso por dias (%)
- `DiasSince`: Dias desde a última troca
- `IntervaloDias`: Intervalo de manutenção em dias (ex: a cada 180 dias)

**Explicação:**  
Alguns itens de manutenção têm prazo por tempo, não apenas por km. Divide os dias passados pelo intervalo e multiplica por 100.

**Exemplo:**
```
DiasSince = 150 dias
IntervaloDias = 180 dias

ProgressoDias = (150 / 180) × 100 = 83,3%
```

---

### 3.4 KM Restantes

**Fórmula:**
```
KMRestantes = max(IntervaloKM - KMSince, 0)
```

**Descrição:**  
Calcula quantos quilômetros faltam para a próxima manutenção.

**Variáveis:**
- `KMRestantes`: KM restantes até a troca
- `IntervaloKM`: Intervalo de manutenção em KM
- `KMSince`: KM percorridos desde a troca

**Explicação:**  
Subtrai os km percorridos do intervalo. Se o resultado for negativo (manutenção atrasada), retorna 0.

**Exemplo:**
```
IntervaloKM = 1000 km
KMSince = 800 km

KMRestantes = max(1000 - 800, 0) = 200 km
```

---

### 3.5 Dias Restantes por KM

**Fórmula:**
```
DiasRestantesKM = KMRestantes / MédiaKM_Diária
```

**Descrição:**  
Estima em quantos dias a manutenção será necessária, baseado na sua média de km por dia.

**Variáveis:**
- `DiasRestantesKM`: Dias estimados até a troca
- `KMRestantes`: KM restantes até a troca
- `MédiaKM_Diária`: Média de km rodados por dia

**Explicação:**  
Divide os km restantes pela média diária de km. Isso prevê quando você precisará fazer a manutenção.

**Exemplo:**
```
KMRestantes = 200 km
MédiaKM_Diária = 50 km/dia

DiasRestantesKM = 200 / 50 = 4 dias
```

---

### 3.6 Dias Restantes por Data

**Fórmula:**
```
DiasRestantesData = max(IntervaloDias - DiasSince, 0)
```

**Descrição:**  
Calcula quantos dias faltam para a manutenção por tempo.

**Variáveis:**
- `DiasRestantesData`: Dias restantes até a troca
- `IntervaloDias`: Intervalo de manutenção em dias
- `DiasSince`: Dias desde a última troca

**Explicação:**  
Subtrai os dias passados do intervalo. Se o resultado for negativo, retorna 0.

**Exemplo:**
```
IntervaloDias = 180 dias
DiasSince = 150 dias

DiasRestantesData = max(180 - 150, 0) = 30 dias
```

---

### 3.7 Progresso Final (Crítico)

**Fórmula:**
```
ProgressoFinal = max(ProgressoKM, ProgressoDias)
```

**Descrição:**  
Define qual é o progresso mais crítico: por km ou por dias.

**Variáveis:**
- `ProgressoFinal`: Porcentagem final de progresso (%)
- `ProgressoKM`: Porcentagem de progresso por KM
- `ProgressoDias`: Porcentagem de progresso por dias

**Explicação:**  
O sistema considera o progresso mais avançado entre km e dias. Se por km está em 80% mas por dias está em 90%, o progresso final é 90%.

**Exemplo:**
```
ProgressoKM = 80%
ProgressoDias = 90%

ProgressoFinal = max(80, 90) = 90%
```

---

## 4. Fórmulas de Simulação

### 4.1 Média por Hora (Histórico)

**Fórmula:**
```
MédiaHora = ValorTotal / HorasTotais
```

**Descrição:**  
Calcula a média histórica de ganhos por hora trabalhada.

**Variáveis:**
- `MédiaHora`: Média de ganhos por hora (R$/h)
- `ValorTotal`: Soma de todos os valores recebidos
- `HorasTotais`: Soma de todas as horas trabalhadas

**Explicação:**  
Usado como base para simulações. Representa seu desempenho histórico médio.

**Exemplo:**
```
ValorTotal = R$ 12000,00
HorasTotais = 320 horas

MédiaHora = 12000 / 320 = R$ 37,50/h
```

---

### 4.2 Média por Dia (Histórico)

**Fórmula:**
```
MédiaDia = ValorTotal / DiasTrabalhados
```

**Descrição:**  
Calcula a média histórica de ganhos por dia trabalhado.

**Variáveis:**
- `MédiaDia`: Média de ganhos por dia (R$)
- `ValorTotal`: Soma de todos os valores recebidos
- `DiasTrabalhados`: Total de dias com registro de trabalho

**Explicação:**  
Útil para planejamento diário de metas.

**Exemplo:**
```
ValorTotal = R$ 12000,00
DiasTrabalhados = 40 dias

MédiaDia = 12000 / 40 = R$ 300,00/dia
```

---

### 4.3 Média por KM (Histórico)

**Fórmula:**
```
MédiaKM = ValorTotal / KMTotais
```

**Descrição:**  
Calcula a média histórica de ganhos por quilômetro rodado.

**Variáveis:**
- `MédiaKM`: Média de ganhos por KM (R$/km)
- `ValorTotal`: Soma de todos os valores recebidos
- `KMTotais`: Soma de todos os km rodados

**Explicação:**  
Útil para comparar com o custo por km.

**Exemplo:**
```
ValorTotal = R$ 12000,00
KMTotais = 4000 km

MédiaKM = 12000 / 4000 = R$ 3,00/km
```

---

### 4.4 Ratio de Despesas

**Fórmula:**
```
RatioDespesas = DespesasTotais / GanhosTotais
```

**Descrição:**  
Calcula qual porcentagem dos ganhos é consumida por despesas.

**Variáveis:**
- `RatioDespesas`: Proporção de despesas sobre ganhos (decimal)
- `DespesasTotais`: Soma de todas as despesas
- `GanhosTotais`: Soma de todos os ganhos

**Explicação:**  
Se o ratio é 0,25, significa que 25% dos ganhos vão para despesas. Útil para projetar despesas futuras baseado em ganhos projetados.

**Exemplo:**
```
DespesasTotais = R$ 3000,00
GanhosTotais = R$ 12000,00

RatioDespesas = 3000 / 12000 = 0,25 (25%)
```

---

### 4.5 Projeção de Ganhos Semanais

**Fórmula:**
```
GanhosSemana = TaxaHora × HorasPorSemana
```

**Descrição:**  
Projeta quanto você ganhará na semana baseado nas horas planejadas.

**Variáveis:**
- `GanhosSemana`: Ganhos projetados semanais (R$)
- `TaxaHora`: Valor por hora (média histórica ou simulada)
- `HorasPorSemana`: Horas planejadas para a semana

**Explicação:**  
Multiplica a taxa por hora pelo total de horas planejadas. A taxa pode ser a média histórica ou um valor personalizado na simulação.

**Exemplo:**
```
TaxaHora = R$ 37,50/h
HorasPorSemana = 45 horas

GanhosSemana = 37,50 × 45 = R$ 1687,50
```

---

### 4.6 Projeção de Ganhos Mensais

**Fórmula:**
```
GanhosMês = GanhosSemana × 4
```

**Descrição:**  
Projeta ganhos mensais considerando aproximadamente 4 semanas.

**Variáveis:**
- `GanhosMês`: Ganhos projetados mensais (R$)
- `GanhosSemana`: Ganhos projetados semanais (R$)

**Explicação:**
Multiplica os ganhos semanais por 4. É uma simplificação (meses têm ~4,3 semanas).

**Exemplo:**
```
GanhosSemana = R$ 1687,50

GanhosMês = 1687,50 × 4 = R$ 6750,00
```

---

### 4.7 Custos Fixos Mensais

**Fórmula:**
```
CustosFixosMês = (IPVA + Licenciamento) / 12 + Seguro
```

**Descrição:**  
Calcula os custos fixos mensais do veículo.

**Variáveis:**
- `CustosFixosMês`: Custos fixos por mês (R$)
- `IPVA`: Valor anual do IPVA (R$)
- `Licenciamento`: Valor anual do licenciamento (R$)
- `Seguro`: Valor mensal do seguro (R$)

**Explicação:**  
IPVA e licenciamento são anuais, então dividimos por 12 meses. Somamos ao seguro mensal.

**Exemplo:**
```
IPVA = R$ 730,00/ano
Licenciamento = R$ 182,50/ano
Seguro = R$ 120,00/mês

CustosFixosMês = (730 + 182,50) / 12 + 120 = 76,04 + 120 = R$ 196,04/mês
```

---

### 4.8 Despesas Variáveis Projetadas

**Fórmula:**
```
DespesasVariáveis = GanhosProjetados × RatioDespesas
```

**Descrição:**  
Projeta despesas variáveis baseado nos ganhos projetados e no ratio histórico.

**Variáveis:**
- `DespesasVariáveis`: Despesas variáveis projetadas (R$)
- `GanhosProjetados`: Ganhos projetados (semanais ou mensais)
- `RatioDespesas`: Proporção histórica de despesas

**Explicação:**  
Multiplica os ganhos projetados pelo ratio. Assume que a proporção de despesas se manterá.

**Exemplo:**
```
GanhosProjetados = R$ 6750,00
RatioDespesas = 0,25

DespesasVariáveis = 6750 × 0,25 = R$ 1687,50
```

---

### 4.9 Lucro Líquido Projetado

**Fórmula:**
```
LíquidoProjetado = GanhosProjetados - DespesasVariáveis - CustosFixos
```

**Descrição:**  
Calcula o lucro líquido projetado descontando todas as despesas e custos.

**Variáveis:**
- `LíquidoProjetado`: Lucro líquido projetado (R$)
- `GanhosProjetados`: Ganhos projetados
- `DespesasVariáveis`: Despesas variáveis projetadas
- `CustosFixos`: Custos fixos do período

**Explicação:**  
Subtrai todas as despesas e custos dos ganhos projetados para obter o lucro estimado.

**Exemplo:**
```
GanhosProjetados = R$ 6750,00
DespesasVariáveis = R$ 1687,50
CustosFixos = R$ 196,04

LíquidoProjetado = 6750 - 1687,50 - 196,04 = R$ 4866,46
```

---

## Considerações Finais

### Precisão dos Cálculos

- **Fórmulas de Combustível**: A precisão depende de calibrações regulares (entrar na reserva). Quanto mais calibrações, mais precisa a média.
- **Fórmulas Financeiras**: Utilizam dados históricos para projeções. Resultados são estimativas.
- **Fórmulas de Manutenção**: Consideram tanto km quanto tempo. O progresso final sempre usa o valor mais crítico.
- **Fórmulas de Simulação**: Baseiam-se em médias históricas. Variações de demanda podem alterar resultados reais.

### Limitações Conhecidas

1. O cálculo de horas trabalhadas considera horários de início e fim informados pelo usuário.
2. A projeção mensal assume 4 semanas, quando na realidade são ~4,3 semanas.
3. Custos fixos não incluem depreciação do veículo.
4. O ratio de despesas assume padrão constante, mas pode variar sazonalmente.

---

*Documentação gerada para o projeto OrganizaAi - O seu lucro, sob controle.*
