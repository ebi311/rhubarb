import LoginButton from "./_components/LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const isUnauthorized = error === "unauthorized";

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center mb-4">ログイン</h2>
          
          {isUnauthorized && (
            <div role="alert" className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">
                このアカウントは登録されていません。
                <br />
                管理者にお問い合わせください。
              </span>
            </div>
          )}

          <p className="text-center mb-6 text-sm text-base-content/70">
            Googleアカウントを使用してログインしてください。
          </p>
          <div className="card-actions justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}
