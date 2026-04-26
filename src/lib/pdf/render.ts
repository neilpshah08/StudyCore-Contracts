import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import ContractDocument from "@/lib/pdf/ContractDocument";
import type { Contract } from "@/lib/types";

export async function renderContractPdf(
  contract: Contract,
  signatureDataUrl: string,
  signedAtIso: string
): Promise<Buffer> {
  const element = React.createElement(ContractDocument, {
    contract,
    signatureDataUrl,
    signedAt: signedAtIso,
  });
  return await renderToBuffer(element as any);
}
