export type AppModality = 'passageiro' | 'entrega';
export type ColorTheme = 'red' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'black';

export interface RideEntry {
  id: string;
  date: string; // ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  kmDriven: number;
  numRides: number;
  totalValue: number;
  region: string;
  appRides: {
    appName: string;
    modality: AppModality;
    count: number;
    value: number;
  }[];
}

export interface Expense {
  id: string;
  date: string;
  type: 'combustivel' | 'manutencao' | 'imposto' | 'multa' | 'parcela' | 'alimentacao' | 'seguro' | 'outros';
  value: number;
  description: string;
  // Fuel specific
  location?: string;
  liters?: number;
  pricePerLiter?: number;
  enteredReserve?: boolean;
  kmOnReserve?: number;
  isFullTank?: boolean;
  fuelType?: 'gasolina' | 'alcool' | 'gnv';
  odometerKm?: number;
}

export interface Goal {
  id: string;
  type: 'diaria' | 'semanal' | 'mensal';
  targetValue: number;
  startDate: string;
  createdAt?: string;
}

export interface MaintenanceHistory {
  id: string;
  date: string;
  km: number;
  cost: number;
  description?: string;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  intervalKm: number;
  intervalDays?: number;
  lastChangeKm: number;
  lastChangeDate: string;
  estimatedCost: number;
  position?: 'dianteiro' | 'traseiro' | 'esquerdo_dianteiro' | 'direito_dianteiro' | 'esquerdo_traseiro' | 'direito_traseiro';
  history?: MaintenanceHistory[];
}

export interface WorkPeriod {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface WorkDay {
  day: string;
  active: boolean;
  periods: WorkPeriod[];
}

export interface UserProfile {
  name: string;
  vehicleType: 'carro' | 'moto';
  vehicleModel: string;
  vehicleOdometerKm?: number; // KM total atual do odômetro do veículo
  kmPerLiter?: number;
  totalTankSize?: number; // Capacidade total incluindo a reserva
  reserveSize?: number; // Capacidade da reserva (parte do totalTankSize)
  // Annual costs
  ipvaValue?: number;
  licensingValue?: number;
  // Monthly costs
  insuranceValue?: number;
  // Work schedule
  workSchedule?: WorkDay[];
}

export interface AppState {
  profile: UserProfile | null;
  rides: RideEntry[];
  expenses: Expense[];
  goals: Goal[];
  maintenance: MaintenanceItem[];
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
}
