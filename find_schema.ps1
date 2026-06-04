Select-String -Path 'prisma/schema.prisma' -Pattern 'model FundingDisbursement|paymentVoucherUrl|paidById|paidAt|paymentNote' | ForEach-Object { $_.LineNumber.ToString() + ': ' + $_.Line }
