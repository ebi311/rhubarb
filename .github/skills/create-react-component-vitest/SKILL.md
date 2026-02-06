---
name: create-vitest
description: vitest による Ract の component test を実装するときのテンプレートと注意点
---

## 使用ツール、フレームワーク

- [vitest](https://vitest.dev/guide/)
- [testing-library](https://testing-library.com/docs/)

## テンプレート

同期コンポーネントの場合

```tsx
import { renderWithUser } from '@/testUtils';
import { screen } from '@testing-library/react';
import <%= component_name %> from './<%= component_name %>';

type Props = React.ComponentProps<typeof <%= component_name %>>;
const render = (props: Props) => {
  const { ...rest } = props;
  return renderWithUser(<<%= component_name %> {...rest} />);
  // children がある場合
  // const { children, ...rest } = props;
  // return renderWithUser(<<%= component_name %> {...rest}>{children}</<%= component_name %>>);
};

describe('<%= テストの概要 %>', () => {
  test('renders component', () => {
    render({});
    // const { user } = render({}); // userEvent を使う場合
    expect(screen.getByText('<%= component_name %>')).toBeInTheDocument();
  });
  // インタラクティブテスト、非同期テストの場合
  test('async test', async () => {
    const { user } = render({});
    await user.click(screen.getByRole('button'));
  });
});
```

非同期コンポーネントの場合

```tsx
import { renderWithUserForAsyncComponent } from '@/testUtils';
import { screen } from '@testing-library/react';
import <%= component_name %> from './<%= component_name %>';

type Props = React.ComponentProps<typeof <%= component_name %>>;
const render = (props: Props) => {
  const { ...rest } = props;
  const render = async (props: ComponentProps<typeof Page>) => {
    return await renderWithUserForAsyncComponent<
      typeof Page,
      ComponentProps<typeof Page>
    >(Page, props);
  };
  // children がある場合でも上記が使える
};

describe('<%= テストの概要 %>', () => {
  test('renders component', async () => {
    await render({
      // 必要なプロパティ
    });
    // const { user } = render({}); // userEvent を使う場合
    expect(screen.getByText('<%= component_name %>')).toBeInTheDocument();
  };
  // インタラクティブテスト、非同期テストの場合
  test('async test', async () => {
    const { user } = render({});
    await user.click(screen.getByRole('button'));
  });
}););
});
```

## 注意点

### description

- 機能ごとに適切に `description` でグループ化する。必要に応じて nest した `description` を設ける。

### モック

- モックを利用するときは、`vi.mock` を使う。これは、実行時にロールアップされるので、対象モジュールの動的 import は必要ない。

### リファクタ

- テストコードもリファクタリングする。
