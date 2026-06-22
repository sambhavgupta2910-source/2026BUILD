// Demo signed-in customer organization.
export const account = {
  org: {
    name: "Skyline Aviation MRO",
    accountNumber: "ARW-CUST-10428",
    terms: "Net 30",
    creditLimitUsd: 2_500_000,
    creditUsedUsd: 814_500,
    currency: "USD",
  },
  contact: {
    name: "Rahul Anand",
    role: "Procurement Lead",
    email: "r.anand@skyline-mro.example",
    initials: "RA",
  },
  users: [
    { name: "Rahul Anand", email: "r.anand@skyline-mro.example", role: "Admin" },
    { name: "Mona Haddad", email: "m.haddad@skyline-mro.example", role: "Buyer" },
    { name: "Tom Becker", email: "t.becker@skyline-mro.example", role: "Buyer" },
    { name: "Lia Costa", email: "l.costa@skyline-mro.example", role: "Viewer" },
  ],
  shipTo: [
    {
      label: "Skyline MRO — Dubai (DWC)",
      address: "Dubai South, Logistics District, Dubai, UAE",
      default: true,
    },
    {
      label: "Skyline MRO — Singapore (SIN)",
      address: "Seletar Aerospace Park, Singapore",
      default: false,
    },
    {
      label: "Skyline MRO — Miami (MIA)",
      address: "NW 36th Street, Miami, FL, USA",
      default: false,
    },
  ],
};
