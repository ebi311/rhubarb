# ドキュメント

訪問介護事業所向けシフト管理 Web アプリ「Rhubarb」のドキュメントです。

## ディレクトリ構成

```
docs/
├── use-cases/       # ユースケース（ユーザーの目標・シナリオ）
├── features/        # 機能仕様（ビジネスルール・API仕様）
├── screens/         # 画面仕様（UI・レイアウト・操作）
├── task/            # 開発タスクの履歴
└── troubleshooting/ # トラブルシューティング
```

## 主要ドキュメント

| ファイル                                                       | 説明                     |
| -------------------------------------------------------------- | ------------------------ |
| [MVP.md](MVP.md)                                               | MVP 定義・機能要件       |
| [BusinessEntity.md](BusinessEntity.md)                         | ビジネスエンティティ定義 |
| [module-structure.md](module-structure.md)                     | モジュール構成           |
| [physical-architecture.md](physical-architecture.md)           | 物理アーキテクチャ       |
| [non-functional-requirement.md](non-functional-requirement.md) | 非機能要件               |
| [mvp-implementation-roadmap.md](mvp-implementation-roadmap.md) | MVP 実装ロードマップ     |

## ユースケース

ユーザーがシステムで達成したい目標（ゴール）を記述。

| ファイル                                                                           | 説明                 |
| ---------------------------------------------------------------------------------- | -------------------- |
| [UC01-authentication.md](use-cases/UC01-authentication.md)                         | 認証                 |
| [UC02-staff-management.md](use-cases/UC02-staff-management.md)                     | スタッフ管理         |
| [UC03-client-management.md](use-cases/UC03-client-management.md)                   | 利用者管理           |
| [UC04-basic-schedule-management.md](use-cases/UC04-basic-schedule-management.md)   | 基本スケジュール管理 |
| [UC05-weekly-schedule-management.md](use-cases/UC05-weekly-schedule-management.md) | 週間スケジュール管理 |

## 機能仕様

システムが提供する機能の仕様。

| ファイル                                              | 説明                 |
| ----------------------------------------------------- | -------------------- |
| [authentication.md](features/authentication.md)       | 認証機能             |
| [staff-management.md](features/staff-management.md)   | スタッフ管理機能     |
| [client-management.md](features/client-management.md) | 利用者管理機能       |
| [basic-schedule.md](features/basic-schedule.md)       | 基本スケジュール機能 |
| [weekly-schedule.md](features/weekly-schedule.md)     | 週間スケジュール機能 |

## 画面仕様

各画面の仕様。

| ファイル                                                               | URL                                | 説明                     |
| ---------------------------------------------------------------------- | ---------------------------------- | ------------------------ |
| [login.md](screens/login.md)                                           | `/login`                           | ログイン画面             |
| [admin-staffs.md](screens/admin-staffs.md)                             | `/admin/staffs`                    | スタッフ一覧画面         |
| [admin-clients.md](screens/admin-clients.md)                           | `/admin/clients`                   | 利用者一覧画面           |
| [admin-basic-schedules.md](screens/admin-basic-schedules.md)           | `/admin/basic-schedules`           | 基本スケジュール一覧画面 |
| [admin-basic-schedules-new.md](screens/admin-basic-schedules-new.md)   | `/admin/basic-schedules/new`       | 基本スケジュール登録画面 |
| [admin-basic-schedules-edit.md](screens/admin-basic-schedules-edit.md) | `/admin/basic-schedules/[id]/edit` | 基本スケジュール編集画面 |
| [admin-weekly-schedules.md](screens/admin-weekly-schedules.md)         | `/admin/weekly-schedules`          | 週間スケジュール画面     |

## その他

- [task/](task/) - 開発タスクの履歴
- [troubleshooting/](troubleshooting/) - トラブルシューティングガイド
- [features/archives/](features/archives/) - 過去の機能仕様書（開発履歴）
