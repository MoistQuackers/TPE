// netlify/functions/get-sales.js
// Pulls TPE (Tax Plan Experts, HS-002) + all its sub-affiliates' deals directly
// from Supabase, in the exact shape dashboard.js already expects.
// Replaces the old Google Apps Script / spreadsheet pull.

const { createClient } = require('@supabase/supabase-js');

// DB status -> dashboard-facing label (matches what dashboard.js checks for "completed")
const STATUS_MAP = {
  'Submitted':               'Submitted',
  'Docs_Sent':                'Waiting Signature',
  'Docs_Signed':              'Waiting Payment',
  'Docs_Expired':             'Docs Expired',
  'Wire_Instructions_Sent':   'Waiting Payment',
  'Wired':                    'Completed',
  'BoxHouse_Paid':            'Completed',
  'Affiliate_Paid':           'Completed',
  'Partially_Paid':           'Partially Paid',
  'Cancelled':                'Canceled',
};

function mapStatus(raw) {
  return STATUS_MAP[raw] || raw || '';
}

function fmtDate(d) {
  return d || '';
}

const CURRENT_TAX_YEAR = 2026;
const TPE_AFFILIATE_CODE = 'HS-002';

exports.handler = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Find TPE's own affiliate ID
    const { data: tpe, error: tpeErr } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', TPE_AFFILIATE_CODE)
      .maybeSingle();

    if (tpeErr || !tpe) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Could not find Tax Plan Experts affiliate record' }),
      };
    }

    // 2. Recursively find every sub-affiliate that redirects payment to TPE
    //    (handles multi-level chains the same way the affiliate portal does)
    const visited = new Set([tpe.id]);
    const toVisit = [tpe.id];
    while (toVisit.length > 0) {
      const currentId = toVisit.pop();
      const { data: subs } = await supabase
        .from('affiliate_relationships')
        .select('from_affiliate_id')
        .eq('to_affiliate_id', currentId)
        .eq('relationship_type', 'redirect_payment')
        .eq('status', 'Active');

      (subs || []).forEach((r) => {
        if (!visited.has(r.from_affiliate_id)) {
          visited.add(r.from_affiliate_id);
          toVisit.push(r.from_affiliate_id);
        }
      });
    }

    const visibleIds = [...visited];

    // 3. Pull every deal attributed to TPE or any of its sub-affiliates
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(`
        id, deal_code, first_name, last_name, email, phone,
        unit_model, status, tax_year,
        docs_sent_date, docs_signed_date, payment_received_date,
        attributed_affiliate_id,
        attributed_affiliate:affiliates!attributed_affiliate_id (
          display_name, legal_name, jotform_advisor_param
        )
      `)
      .in('attributed_affiliate_id', visibleIds)
      .eq('tax_year', CURRENT_TAX_YEAR)
      .neq('status', 'Cancelled')
      .order('created_at', { ascending: true });

    if (dealsError) {
      console.error('get-sales query error:', dealsError);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: dealsError.message }),
      };
    }

    // 4. Map to the exact shape dashboard.js expects
    const sales = (deals || []).map((d) => {
      let repName =
        d.attributed_affiliate?.display_name ||
        d.attributed_affiliate?.legal_name ||
        d.attributed_affiliate?.jotform_advisor_param ||
        '';
      // Strip TPE/JG/TIG umbrella prefixes for uniform display in the rep-facing portal
      repName = repName.replace(/^(TPE|JG|TIG)\s+/i, '').trim();

      return {
        status: mapStatus(d.status),
        firstName: d.first_name || '',
        lastName: d.last_name || '',
        email: d.email || '',
        phone: d.phone || '',
        salesRep: repName,
        model: d.unit_model || '',
        docsSent: fmtDate(d.docs_sent_date),
        docsSigned: fmtDate(d.docs_signed_date),
        paymentReceived: fmtDate(d.payment_received_date),
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sales }),
    };
  } catch (error) {
    console.error('get-sales error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Server error while fetching sales data' }),
    };
  }
};
