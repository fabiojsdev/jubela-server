export class CreatePreferenceDto {
  items: Array<{
    id: string; // obrigatório
    title: string;
    description?: string;
    picture_url?: string;
    category_id?: string;
    quantity: number;
    currency_id: string; // obrigatório
    unit_price: number;
  }>;
  payer?: {
    email?: string;
    name?: string;
    last_name?: string;
  };
  external_reference?: string; // seu orderId
}
