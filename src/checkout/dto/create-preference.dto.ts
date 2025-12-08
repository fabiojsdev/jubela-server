export class CreatePreferenceDto {
  items: Array<{
    id?: string;
    title: string;
    description?: string;
    quantity: number;
    currency_id?: string; // ex: 'BRL' / 'ARS'
    unit_price: number;
  }>;
  payer?: {
    email?: string;
    name?: string;
    last_name?: string;
  };
  external_reference?: string; // seu orderId
}
