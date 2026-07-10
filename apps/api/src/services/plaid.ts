import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

export const plaidClient = new PlaidApi(config);

export const PLAID_PRODUCTS = (
  process.env.PLAID_PRODUCTS || 'transactions'
).split(',') as Products[];

export const PLAID_COUNTRY_CODES = (
  process.env.PLAID_COUNTRY_CODES || 'US'
).split(',') as CountryCode[];

export const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';
