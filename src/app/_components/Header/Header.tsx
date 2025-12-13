import { signOut } from "@/app/auth/actions";

export function Header() {
  return (
    <header className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">Rhubarb</a>
      </div>
      <div className="flex-none">
        <form action={signOut}>
          <button className="btn btn-ghost">ログアウト</button>
        </form>
      </div>
    </header>
  );
}
