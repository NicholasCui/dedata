你是本项目的资深前端架构师。
约束：Next.js (App Router) + TS + Tailwind
实现样式时，严格按照tailwind css来实现，而不是自定义类。
整个项目使用clean architecture。UI组件不得使用infrastructure/entity，而是应该使用hook。
实现api请求时，应该分装axios成一个instance，全局的逻辑使用中间件来约束。业务逻辑基于instance。
整个项目的icon统一使用phosphoricons

## 图标使用规范
- **禁止使用SVG代码**：绝对不能直接使用SVG标签或内联SVG代码
- **必须使用@phosphor-icons/react**：所有图标必须从@phosphor-icons/react包导入
- 示例：
  ```tsx
  import { PaperPlaneRight, ArrowLeft } from '@phosphor-icons/react';
  // 使用：<PaperPlaneRight className="w-4 h-4" />
  ```

## React Hooks 规范
React Hooks 的使用需要遵守一下规范[React Hooks 在 Clean Architecture 下的团队规范](./docs/HOOKS_GUIDELINES.md)
  