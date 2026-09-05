"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PreviewRecord } from "@/types/preview";

const trim = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

const sortableColumns = new Set([
  "id",
  "posting_date",
  "value_date",
  "amount",
  "request_amount",
  "amountbdt",
  "amountusd",
  "time_stamp",
  "rrn",
]);

function createColumn(
  accessorKey: string,
  title: string,
  sortable = true,
): ColumnDef<PreviewRecord> {
  return {
    accessorKey,
    enableSorting: sortable && sortableColumns.has(accessorKey),
    header: ({ column }) => {
      if (!column.getCanSort()) {
        return <div className="px-0">{title}</div>;
      }

      return (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {title}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    cell: ({ getValue }) => (
      <div className="whitespace-nowrap">{String(trim(getValue()) ?? "")}</div>
    ),
  };
}

export const columns: ColumnDef<PreviewRecord>[] = [
  createColumn("posting_date", "Posting Date", true),
  createColumn("value_date", "Value Date", true),
  createColumn("batch_id", "Batch ID", false),
  createColumn("posting_branch", "Posting Branch", false),
  createColumn("unique_reference_no", "Reference No", false),
  createColumn("debit_credit", "Debit / Credit", false),
  createColumn("amount", "Amount", true),
  createColumn("transaction_code", "Transaction Code", false),
  createColumn("transaction_name", "Transaction Name", false),
  createColumn("curency", "Currency", false),
  createColumn("time_stamp", "Timestamp", true),
  createColumn("unique_id", "Unique ID", false),
  createColumn("narrative_1", "Narrative 1", false),
  createColumn("narrative_2", "Narrative 2", false),
  createColumn("narrative_3", "Narrative 3", false),
  createColumn("narrative_4", "Narrative 4", false),
  createColumn("rrn", "RRN", true),
  createColumn("auth_code", "Auth Code", false),
];

export const boColumns: ColumnDef<PreviewRecord>[] = [
  createColumn("session_id", "Session ID", false),
  createColumn("bo_oper_id", "BO Operation ID", false),
  createColumn("ep_sttl_date", "EP Settlement Date", false),
  createColumn("run_date", "Run Date", false),
  createColumn("trx_type", "TRX Type", false),
  createColumn("message_type", "Message Type", false),
  createColumn("contract_type", "Contract Type", false),
  createColumn("card_number", "Card Number", false),
  createColumn("account_number", "Account Number", false),
  createColumn("sender_account_number", "Sender Account", false),
  createColumn("auth_code", "Auth Code", false),
  createColumn("arn", "ARN", false),
  createColumn("trans_date", "Transaction Date", false),
  createColumn("sttl_amount", "Settlement Amount", false),
  createColumn("st_rev", "Settlement Reversal", false),
  createColumn("merchant_name", "Merchant Name", false),
  createColumn("merchant_country", "Merchant Country", false),
  createColumn("transaction_date", "Authorization Date", false),
  createColumn("reversal_flag", "Reversal Flag", false),
  createColumn("auth_message_type", "Auth Message Type", false),
  createColumn("utrnno", "UTRN No", false),
  createColumn("rrn", "RRN", true),
];

export const acquiringFeColumns: ColumnDef<PreviewRecord>[] = [
  createColumn("id", "ID", true),
  createColumn("atm_id", "ATM ID", false),
  createColumn("reversal", "Reversal", false),
  createColumn("request_amount", "Request Amount", true),
  createColumn("bills1", "Bills 1", false),
  createColumn("bills2", "Bills 2", false),
  createColumn("bills3", "Bills 3", false),
  createColumn("bills4", "Bills 4", false),
  createColumn("udate", "Date", false),
  createColumn("time", "Time", false),
  createColumn("utr_no", "UTR No", false),
  createColumn("issuer_inst", "Issuer Institution", false),
  createColumn("reference_num", "Reference Number", false),
  createColumn("auth_code", "Auth Code", false),
  createColumn("acct1", "Account", false),
  createColumn("hpan_card", "HPAN Card", false),
];

export const acquiringEpColumns: ColumnDef<PreviewRecord>[] = [
  createColumn("id", "ID", true),
  createColumn("pan", "PAN", false),
  createColumn("rrn", "RRN", true),
  createColumn("acq", "ACQ", false),
  createColumn("integratedp", "Integrated P", false),
  createColumn("aymen", "Aymen", false),
  createColumn("tsyste", "T Syste", false),
  createColumn("m", "M", false),
  createColumn("amountbdt", "Amount BDT", true),
  createColumn("currency", "Currency", false),
  createColumn("amountusd", "Amount USD", true),
];
