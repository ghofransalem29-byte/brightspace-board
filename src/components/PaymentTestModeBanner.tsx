const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-red-300 bg-red-100 px-4 py-2 text-center font-mono-ui text-[11px] uppercase tracking-[0.18em] text-red-800">
        Payments not configured for production. Complete go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center font-mono-ui text-[11px] uppercase tracking-[0.18em] text-orange-800">
        Preview payments are in test mode.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Read more
        </a>
      </div>
    );
  }
  return null;
}