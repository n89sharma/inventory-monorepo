import { z } from 'zod';


export const CoreFunctionsSchema = z.object({
  id: z.number(),
  accessory: z.string()
});
export const AssetTypeSchema = z.object({
  id: z.number(),
  asset_type: z.string()
});
export const BrandSchema = z.object({
  id: z.number(),
  name: z.string()
});

export const StatusSchema = z.object({
  id: z.number(),
  status: z.string()
});
const InvoiceTypeSchema = z.object({
  id: z.number(),
  type: z.string()
});

export const WarehouseSchema = z.object({
  id: z.number(),
  city_code: z.string(),
  street: z.string(),
  is_active: z.boolean()
})

export const AssetLocationSchema = z.object({
  id: z.number(),
  warehouse_id: z.number(),
  zone_id: z.number(),
  zone: z.string(),
  bin: z.string(),
})

export const ZoneSchema = z.object({
  id: z.number(),
  zone: z.string(),
})

export const CountrySchema = z.object({
  id: z.number(),
  name: z.string()
})

export const ErrorSchema = z.object({
  id: z.number(),
  brand_id: z.number(),
  code: z.string(),
  description: z.string().nullable(),
  category: z.string()
})

export const ReferenceDataSchema = z.object({
  coreFunctions: z.array(CoreFunctionsSchema),
  assetTypes: z.array(AssetTypeSchema),
  brands: z.array(BrandSchema),
  statuses: z.array(StatusSchema),
  readinesses: z.array(StatusSchema),
  invoiceTypes: z.array(InvoiceTypeSchema),
  warehouses: z.array(WarehouseSchema),
  zones: z.array(ZoneSchema),
  errors: z.array(ErrorSchema),
  countries: z.array(CountrySchema)
});

export const CreateBrandSchema = z.object({
  name: z.string().min(1)
})

export type CreateBrand = z.infer<typeof CreateBrandSchema>
export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
export type CoreFunction = z.infer<typeof CoreFunctionsSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;
export type Warehouse = z.infer<typeof WarehouseSchema>;
export type AssetLocation = z.infer<typeof AssetLocationSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Error = z.infer<typeof ErrorSchema>;
export type Country = z.infer<typeof CountrySchema>;
