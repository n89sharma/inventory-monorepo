import { z } from 'zod';


export const CoreFunctionsSchema = z.object({
  id: z.number(),
  accessory: z.string()
});
const AssetTypeScehma = z.object({
  id: z.number(),
  asset_type: z.string()
});

export const StatusSchema = z.object({
  id: z.number(),
  status: z.string()
});
const RoleSchema = z.object({
  id: z.number(),
  role: z.string()
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
});
export const ReferenceDataSchema = z.object({
  coreFunctions: z.array(CoreFunctionsSchema),
  assetTypes: z.array(AssetTypeScehma),
  trackingStatuses: z.array(StatusSchema),
  availabilityStatuses: z.array(StatusSchema),
  technicalStatuses: z.array(StatusSchema),
  roles: z.array(RoleSchema),
  invoiceTypes: z.array(InvoiceTypeSchema),
  warehouses: z.array(WarehouseSchema)
});

export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
export type CoreFunction = z.infer<typeof CoreFunctionsSchema>;
export type AssetType = z.infer<typeof AssetTypeScehma>;
export type Status = z.infer<typeof StatusSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;
export type Warehouse = z.infer<typeof WarehouseSchema>;
