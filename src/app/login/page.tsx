import LoginButton from "./_components/LoginButton";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center mb-4">ログイン</h2>
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
