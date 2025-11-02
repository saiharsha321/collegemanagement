export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            College Management System
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Streamline college administration and student management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}