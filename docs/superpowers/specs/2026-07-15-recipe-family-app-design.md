# 轻量家庭菜谱与点菜 APP 产品设计文档

日期：2026-07-15

## 1. 背景与目标

本 APP 是一个轻量级的家庭菜谱与点菜协作工具。它不是公开菜谱社区，也不是外卖或餐饮管理系统，而是服务于一个或多个“家庭”内部：成员可以记录自己做过或会做的菜，把部分菜谱共享到家庭空间，其他家庭成员可以基于家庭菜谱点菜，并指定某位家庭成员在某个餐次制作。

首版目标是完成核心闭环：

1. 用户注册并登录。
2. 用户创建自己的菜谱。
3. 用户创建或加入家庭。
4. 用户把自己的菜谱选择性加入家庭。
5. 家庭成员浏览家庭菜谱并点菜。
6. 点菜时选择做菜人、餐次、期望日期或时间。
7. 做菜人收到 APP 内通知。
8. 做菜人接受后设置或确认提醒时间。
9. 「清单」展示已点菜和待做菜任务。
10. 做菜任务完成后可标记完成。

## 2. MVP 范围

### 2.1 首版包含

- 手机号/邮箱 + 密码注册登录。
- 个人菜谱创建、编辑、删除和查看。
- 菜谱照片上传。
- 做菜流程步骤记录。
- 创建家庭。
- 邀请码加入家庭。
- 简单家庭权限：管理员与普通成员。
- 将个人菜谱共享到家庭。
- 家庭菜谱浏览和点菜。
- 指派家庭成员做菜。
- 选择餐次：早餐、上午茶、午餐、下午茶、晚餐、夜宵。
- APP 内通知。
- 手机本地做菜提醒。
- 清单展示我点的菜、我要做的菜。
- 基础账户设置、主题设置、提醒管理、帮助与反馈、关于。

### 2.2 首版暂不包含

- 公开菜谱广场。
- 菜谱评论、点赞、收藏他人公开菜谱。
- 购物清单或食材自动汇总。
- 复杂角色权限。
- 家庭菜谱审核流。
- 跨家庭公开搜索。
- 系统级远程推送通知。
- 复杂页面装修设计器。
- 短信验证码登录。
- 第三方登录。

### 2.3 首版预留

- 菜谱图片多图扩展。
- 家庭空间背景图。
- 主题配置。
- 对象存储切换。
- 远程推送通知。
- 第三方登录。
- 家庭空间装修。

## 3. 一级导航与核心流程

### 3.1 一级导航

APP 底部一级导航包含 4 个模块：

- 菜谱
  - 我的菜谱列表。
  - 新建菜谱。
  - 编辑/删除菜谱。
  - 设置菜谱是否加入某个家庭。
- 家庭
  - 未加入家庭时：创建家庭 / 输入邀请码加入家庭。
  - 已加入家庭后：家庭首页、成员管理、家庭菜谱、点菜、主动做菜。
- 清单
  - 我点的菜。
  - 指派给我做的菜。
  - 待确认、待做、已完成任务。
- 设置
  - 账户。
  - 主题。
  - 提醒管理。
  - 帮助与反馈。
  - 关于。

### 3.2 创建菜谱流程

用户进入「菜谱」 → 点击添加 → 上传菜品照片 → 填写菜名、制作者、步骤、备注 → 保存。

菜谱默认属于用户个人，不会自动进入家庭。

### 3.3 创建/加入家庭流程

用户进入「家庭」 → 如果没有家庭，选择创建家庭或输入邀请码加入家庭。

创建者成为家庭管理员。管理员可以修改家庭名称、背景图、邀请码、移除成员。

### 3.4 共享菜谱到家庭流程

用户在个人菜谱详情或编辑页选择“加入家庭菜谱” → 选择目标家庭 → 保存。

该菜谱会出现在对应家庭的家庭菜谱中。用户也可以取消共享。

### 3.5 点菜流程

家庭成员进入「家庭」 → 家庭菜谱 → 选择菜 → 点菜 → 选择做菜人、餐次、日期/时间、备注 → 提交。

提交后生成一条点菜任务，并给做菜人生成 APP 内通知。

### 3.6 接收做菜流程

做菜人在通知或「清单」中看到任务 → 接受做菜 → 确认提醒时间。

提醒时间可以使用默认值，也可以由用户自定义，例如提前 30 分钟、提前 1 小时、指定时间提醒。

### 3.7 完成任务流程

做菜人在「清单」中标记任务完成。任务状态更新，点菜人可以看到已完成。

## 4. 功能模块设计

### 4.1 注册与登录模块

首版支持手机号/邮箱 + 密码注册登录。

主要能力：

- 用户注册。
- 用户登录。
- 用户退出登录。
- 查看和编辑基础账户信息。
- 修改密码。
- 登录态保持。

用户信息包括：

- 昵称。
- 手机号或邮箱。
- 头像。
- 注册时间。
- 最近登录时间。

首版不接入短信验证码和第三方登录，但后端账户模型保留扩展空间。

### 4.2 菜谱模块

「菜谱」模块用于管理用户自己的私有菜谱。

每个菜谱包括：

- 菜名。
- 菜品照片。
- 制作者。
- 简介/备注。
- 做菜步骤。
- 可选标签。
- 创建者。
- 创建时间。
- 更新时间。

做菜步骤采用结构化设计：

- 步骤序号。
- 步骤文字说明。
- 可选步骤图片。
- 可选预计耗时。

首版支持：

- 新建菜谱。
- 编辑菜谱。
- 删除菜谱。
- 查看菜谱详情。
- 上传/更换菜品主图。
- 管理做菜步骤。
- 将菜谱共享到家庭。
- 从家庭中移除共享。

菜谱默认只属于创建者个人。只有用户主动共享到家庭后，家庭成员才可以看到。

### 4.3 家庭模块

「家庭」模块用于承载家庭成员和共享菜谱。

未加入家庭时：

- 显示空状态。
- 提供「创建家庭」。
- 提供「输入邀请码加入家庭」。

创建家庭时填写：

- 家庭名称。
- 可选家庭头像/封面图。
- 可选简介。

加入家庭时：

- 输入邀请码。
- 系统校验邀请码有效性。
- 加入后成为普通成员。

家庭成员权限：

- 管理员
  - 修改家庭信息。
  - 生成/刷新邀请码。
  - 移除成员。
  - 查看成员列表。
  - 管理家庭菜谱。
- 普通成员
  - 查看家庭信息。
  - 查看成员列表。
  - 共享自己的菜谱到家庭。
  - 从家庭移除自己共享的菜谱。
  - 点菜。
  - 接收做菜任务。
  - 主动做菜。

首版允许一个用户加入多个家庭，但默认展示最近使用或用户选中的家庭。

### 4.4 家庭菜谱管理

家庭菜谱不是复制一份完整菜谱，而是通过关联关系把用户个人菜谱加入某个家庭。

好处：

- 用户更新个人菜谱后，家庭中也能看到最新版本。
- 用户可以控制哪些菜谱进入家庭。
- 方便未来做不同家庭可见范围。

家庭菜谱支持：

- 查看家庭内共享菜谱。
- 按菜名搜索。
- 按制作者筛选。
- 从家庭菜谱发起点菜。
- 菜谱创建者或管理员可移除家庭共享。

### 4.5 点菜模块

点菜是家庭协作的核心动作。

点菜时需要填写：

- 菜谱。
- 点菜人，系统自动记录。
- 做菜人，从家庭成员中选择。
- 餐次。
- 期望制作日期。
- 可选期望制作时间。
- 可选备注，例如“少辣”“不要葱”。

点菜后生成一条做菜任务。

任务状态：

- 待接受：点菜已提交，等待做菜人确认。
- 已接受：做菜人确认做菜。
- 已完成：做菜人完成。
- 已取消：点菜人或相关成员取消。

首版不做复杂拒绝流程。如果做菜人不想做，可以取消任务并填写可选原因，后续版本再做改派或协商流程。

### 4.6 主动做菜

「主动做菜」表示用户不是被别人点菜，而是自己计划给家庭做某道菜。

流程：家庭 → 主动做菜 → 选择家庭菜谱 → 选择餐次、日期/时间 → 创建任务。

主动做菜任务的点菜人和做菜人都是当前用户，但家庭成员可以在家庭动态或清单中看到。

### 4.7 通知与提醒模块

首版采用：

- APP 内通知。
- 手机本地提醒。

APP 内通知包括：

- 有人点菜并指定我做。
- 做菜任务被取消。
- 我点的菜被接受。
- 我点的菜已完成。

本地提醒用于提醒做菜人按时做菜。提醒时间可自定义：

- 默认提前 30 分钟。
- 可选提前 10 分钟、30 分钟、1 小时。
- 可选自定义提醒时间。

本地提醒由前端 Expo Notifications 实现。后端保存提醒配置和任务时间，前端在用户接受任务后注册本地通知。

### 4.8 清单模块

「清单」用于集中展示任务。

建议分为三个视图：

- 我点的菜
  - 我发起的点菜任务。
  - 能看到做菜人、状态、餐次、时间。
- 我要做的菜
  - 指派给我的任务。
  - 支持接受、设置提醒、完成。
- 全部家庭任务
  - 当前家庭内的近期任务。
  - 首版可选，如果实现成本较高，可以放到家庭详情页。

清单支持按状态筛选：

- 待接受。
- 已接受。
- 今天。
- 本周。
- 已完成。
- 已取消。

### 4.9 设置模块

设置包括：

- 账户
  - 头像、昵称、手机号/邮箱、修改密码、退出登录。
- 主题
  - 明亮/深色模式。
  - 基础主题色。
  - 预留背景图配置。
- 提醒管理
  - 默认提醒时间。
  - 是否启用本地提醒。
- 帮助与反馈
  - 常见问题。
  - 提交反馈。
- 关于
  - APP 名称。
  - 版本号。
  - 隐私政策和用户协议入口。

## 5. 技术架构设计

### 5.1 总体架构

首版采用前后端分离架构：

- 移动端前端：React Native + Expo。
- 后端 API：FastAPI。
- 数据库：MySQL。
- 图片存储：统一 Storage Adapter 抽象层。
  - 开发环境：服务器本地文件存储。
  - 生产环境：可切换为 OSS/COS/MinIO/S3。
- 通知提醒：
  - APP 内通知：后端入库，前端轮询或进入页面时拉取。
  - 本地提醒：Expo Notifications 在手机端注册。

数据流：

- 移动端 APP → FastAPI REST API → MySQL。
- 移动端 APP → FastAPI 上传接口 → Storage Adapter → 本地文件/对象存储。
- FastAPI → 通知表 → 移动端拉取通知。
- 移动端 → Expo Notifications → 本地提醒。

首版不引入微服务、消息队列、复杂缓存或远程推送服务。

### 5.2 前端架构

推荐技术栈：

- React Native。
- Expo。
- TypeScript。
- Expo Router 或 React Navigation。
- Zustand 或 Redux Toolkit 管理客户端状态。
- TanStack Query 管理接口请求和缓存。
- React Hook Form 管理表单。
- Zod 做前端表单校验。
- Expo Image Picker 选择图片。
- Expo Notifications 做本地提醒。
- AsyncStorage / SecureStore 保存登录 token。

前端目录建议：

```text
app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    recipes/
    family/
    tasks/
    settings/
src/
  api/
  components/
  features/
    auth/
    recipes/
    families/
    orders/
    notifications/
    settings/
  theme/
  storage/
  types/
```

设计原则：

- 页面层只负责路由和组合。
- 业务逻辑放在 features 中。
- API 请求统一封装。
- 主题和自定义背景能力独立放在 theme 模块。
- 图片上传、token 存储、本地通知封装成独立服务。

为了支持未来自定义界面设计，前端主题系统首版保留：

- light/dark 模式。
- primaryColor。
- backgroundImageUrl。
- familySpaceCoverImageUrl。
- cardStyle。
- fontScale。

首版 UI 可以先固定模板，但配置结构提前设计。

### 5.3 后端架构

推荐技术栈：

- FastAPI。
- Python 3.12+。
- SQLAlchemy 2.x。
- Alembic 数据库迁移。
- Pydantic v2。
- MySQL 8。
- JWT 登录认证。
- Passlib / bcrypt 密码哈希。
- Uvicorn/Gunicorn 部署。
- python-multipart 处理图片上传。

后端目录建议：

```text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      database.py
    api/
      v1/
        auth.py
        users.py
        recipes.py
        families.py
        orders.py
        notifications.py
        uploads.py
    models/
    schemas/
    services/
      auth_service.py
      recipe_service.py
      family_service.py
      order_service.py
      notification_service.py
      storage/
        base.py
        local.py
        s3_like.py
    repositories/
    tests/
  alembic/
```

后端设计原则：

- API 层只处理请求和响应。
- service 层处理业务规则。
- repository 层封装数据库访问。
- storage 层封装图片存储差异。
- schema 和 model 分离。
- 所有家庭相关接口都校验成员身份。
- 所有菜谱修改都校验所有权。

### 5.4 图片存储设计

图片不直接存 MySQL。MySQL 只保存图片元数据和访问地址。

图片类型包括：

- 用户头像。
- 菜谱主图。
- 菜谱步骤图。
- 家庭头像/封面图。
- 未来主题背景图。

图片上传流程：

1. 前端选择或拍摄图片。
2. 前端压缩图片，限制尺寸和大小。
3. 上传到 FastAPI 上传接口。
4. 后端校验文件类型、大小、权限。
5. Storage Adapter 保存文件。
6. 后端返回 image_id 和 URL。
7. 业务表保存 image_id 或 URL 关联。

建议数据库中有独立 images 表：

- id。
- owner_user_id。
- storage_provider。
- bucket。
- object_key。
- public_url 或 relative_url。
- mime_type。
- size_bytes。
- width。
- height。
- purpose。
- created_at。

开发环境：

- 文件保存到 backend/uploads/。
- URL 形如 /static/uploads/recipes/xxx.jpg。

生产环境：

- 文件保存到对象存储。
- MySQL 保存 object_key。
- 返回 CDN 或签名 URL。

首版可以使用公开读 URL，后续如果需要隐私图片，再改为签名 URL。

### 5.5 认证与权限

认证方式：

- 用户注册后登录。
- 后端签发 access token。
- 前端保存 token。
- 请求时通过 Authorization Header 携带。

权限规则：

- 未登录用户不能访问业务 API。
- 用户只能编辑自己的菜谱。
- 用户只能删除自己的菜谱。
- 用户只能把自己的菜谱加入自己所在的家庭。
- 家庭成员可以查看家庭共享菜谱。
- 家庭管理员可以移除成员、改家庭信息。
- 做菜任务只允许相关家庭成员查看。
- 做菜人可以接受和完成自己的任务。
- 点菜人可以取消自己发起的任务。
- 管理员可以取消家庭内任务，首版可选。

### 5.6 通知与提醒技术设计

APP 内通知：

- 后端在点菜、接受、完成、取消等动作时写入 notifications 表。
- 前端进入 APP 或进入清单页时拉取未读通知。
- 用户可以标记通知已读。

本地提醒：

- 做菜人接受任务时，前端根据任务时间和提醒设置注册本地通知。
- 后端保存 reminder_time，方便跨设备或重新登录后恢复。
- 前端启动时同步未来待提醒任务，重新注册本地通知。

首版不做远程推送。因此如果用户长时间不打开 APP，无法收到服务端主动推送。后续版本可接入 APNs/FCM/厂商推送。

### 5.7 部署设计

开发环境：

- 前端：Expo Dev Server。
- 后端：FastAPI Uvicorn。
- 数据库：本地 MySQL 或 Docker MySQL。
- 图片：本地文件存储。

生产环境：

- 云服务器部署 FastAPI。
- MySQL 使用云数据库或同服务器 MySQL。
- 图片使用对象存储或 MinIO。
- Nginx 反向代理 API 和静态资源。
- HTTPS。
- 后端使用环境变量配置数据库、JWT 密钥、图片存储 provider。

### 5.8 技术风险

- React Native 图片上传和压缩需要处理不同机型兼容性。
- 本地提醒依赖用户授权通知权限。
- 本地提醒不是远程推送，用户不打开 APP 时服务端无法主动唤醒。
- 多家庭场景需要在前端明确当前家庭上下文。
- 图片存储如果首版用本地文件，后续迁移对象存储要有脚本迁移 object_key。
- 菜谱被家庭引用后删除，需要定义删除策略。

建议删除策略：

- 用户删除个人菜谱时，如果该菜谱已共享到家庭，则提示会同时从家庭菜谱中移除。
- 已经产生的历史点菜任务保留菜名快照，避免任务详情丢失。

## 6. 数据模型设计

### 6.1 User

用于注册登录和账户资料。

字段：

- id。
- email。
- phone。
- password_hash。
- nickname。
- avatar_image_id。
- status。
- created_at。
- updated_at。
- last_login_at。

约束：

- email 或 phone 至少填写一个。
- email 唯一。
- phone 唯一。
- password_hash 不返回给前端。

### 6.2 Image

统一记录上传图片的元数据。

字段：

- id。
- owner_user_id。
- storage_provider。
- bucket。
- object_key。
- public_url。
- mime_type。
- size_bytes。
- width。
- height。
- purpose。
- created_at。

purpose 可包括：avatar、recipe_main、recipe_step、family_cover、family_avatar、theme_background。

### 6.3 Recipe

用户个人菜谱主体。

字段：

- id。
- owner_user_id。
- title。
- creator_name。
- description。
- main_image_id。
- tags。
- status。
- created_at。
- updated_at。

说明：

- owner_user_id 是系统中的创建者。
- creator_name 是菜品制作者，可手填，例如“妈妈”“我”“爸爸”。
- tags 首版可以用 JSON 字段简化。
- status 包括 active、archived、deleted。

### 6.4 RecipeStep

记录结构化做菜流程。

字段：

- id。
- recipe_id。
- step_no。
- instruction。
- image_id。
- estimated_minutes。
- created_at。
- updated_at。

约束：

- 同一个 recipe_id 下 step_no 有序。
- 删除菜谱时级联处理步骤。

### 6.5 Family

家庭组织主体。

字段：

- id。
- name。
- description。
- owner_user_id。
- avatar_image_id。
- cover_image_id。
- invite_code。
- invite_code_expires_at。
- theme_config。
- created_at。
- updated_at。

说明：

- owner_user_id 默认是管理员。
- invite_code 用于加入家庭。
- theme_config 预留家庭空间自定义，例如主题色、背景图布局、卡片风格。

### 6.6 FamilyMember

用户和家庭之间的成员关系。

字段：

- id。
- family_id。
- user_id。
- role。
- nickname_in_family。
- joined_at。
- status。

role 首版包括 admin、member。

status 包括 active、removed、left。

约束：

- family_id + user_id 唯一。
- 家庭管理员不能直接移除自己，除非先转让管理员或解散家庭；首版可以不做解散，只隐藏入口。

### 6.7 FamilyRecipe

用户将个人菜谱共享到家庭的关联表。

字段：

- id。
- family_id。
- recipe_id。
- shared_by_user_id。
- created_at。
- status。

status 包括 active、removed。

约束：

- family_id + recipe_id 唯一。
- shared_by_user_id 必须是家庭成员。
- recipe.owner_user_id 必须等于 shared_by_user_id，除非后续允许管理员代共享。

### 6.8 CookingOrder

点菜后生成的任务。

字段：

- id。
- family_id。
- recipe_id。
- recipe_title_snapshot。
- recipe_image_snapshot_url。
- requester_user_id。
- assignee_user_id。
- meal_slot。
- scheduled_date。
- scheduled_time。
- note。
- status。
- accepted_at。
- completed_at。
- cancelled_at。
- cancel_reason。
- reminder_time。
- created_at。
- updated_at。

meal_slot 枚举：breakfast、morning_tea、lunch、afternoon_tea、dinner、late_night_snack。

status 枚举：pending_acceptance、accepted、completed、cancelled。

说明：

- recipe_title_snapshot 用于菜谱后续删除或改名后，历史任务仍能显示原始点菜内容。
- recipe_image_snapshot_url 用于清单展示。
- reminder_time 在做菜人接受任务后设置。
- scheduled_time 可为空。

### 6.9 Notification

APP 内通知。

字段：

- id。
- recipient_user_id。
- family_id。
- order_id。
- type。
- title。
- body。
- is_read。
- created_at。
- read_at。

type 可包括：order_assigned、order_accepted、order_completed、order_cancelled、family_joined。

### 6.10 UserSettings

记录用户偏好。

字段：

- id。
- user_id。
- theme_mode。
- primary_color。
- default_reminder_minutes。
- notifications_enabled。
- created_at。
- updated_at。

### 6.11 主要关系

- User 1 - N Recipe。
- Recipe 1 - N RecipeStep。
- User 1 - N Image。
- User N - N Family，通过 FamilyMember。
- Recipe N - N Family，通过 FamilyRecipe。
- Family 1 - N CookingOrder。
- CookingOrder N - 1 requester User。
- CookingOrder N - 1 assignee User。
- User 1 - N Notification。
- User 1 - 1 UserSettings。

### 6.12 数据保留和删除策略

用户删除菜谱：

- 菜谱 status 变为 deleted。
- 从家庭菜谱中移除。
- 历史点菜任务保留快照字段。

用户退出家庭：

- FamilyMember 状态变为 left。
- 用户共享的家庭菜谱可选择自动移除。
- 已完成历史任务保留。
- 未完成且指派给该用户的任务取消并通知点菜人。

家庭成员被移除：

- FamilyMember 状态变为 removed。
- 该成员共享的家庭菜谱从家庭中移除。
- 未完成任务取消并通知相关用户。

图片删除：

- 首版不做立即物理删除，只标记不再引用。
- 后续用定时任务清理孤儿图片。

## 7. API 设计

### 7.1 API 原则

后端 API 使用 REST 风格，统一前缀：/api/v1。

统一成功响应：

```json
{
  "data": {},
  "error": null
}
```

统一错误响应：

```json
{
  "data": null,
  "error": {
    "code": "FAMILY_NOT_FOUND",
    "message": "家庭不存在或无权限访问"
  }
}
```

认证方式：Authorization: Bearer <access_token>。

### 7.2 认证 API

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### 7.3 用户与设置 API

```text
GET   /api/v1/users/me
PATCH /api/v1/users/me
GET   /api/v1/users/me/settings
PATCH /api/v1/users/me/settings
```

### 7.4 上传 API

```text
POST /api/v1/uploads/images
GET  /api/v1/images/{image_id}
```

上传时带 purpose，例如 avatar、recipe_main、recipe_step、family_cover、theme_background。

### 7.5 菜谱 API

```text
GET    /api/v1/recipes
POST   /api/v1/recipes
GET    /api/v1/recipes/{recipe_id}
PATCH  /api/v1/recipes/{recipe_id}
DELETE /api/v1/recipes/{recipe_id}
```

菜谱步骤 MVP 建议跟随菜谱整体提交。

### 7.6 家庭 API

```text
GET    /api/v1/families
POST   /api/v1/families
GET    /api/v1/families/{family_id}
PATCH  /api/v1/families/{family_id}
POST   /api/v1/families/join
POST   /api/v1/families/{family_id}/invite-code/refresh
GET    /api/v1/families/{family_id}/members
DELETE /api/v1/families/{family_id}/members/{user_id}
```

### 7.7 家庭菜谱 API

```text
GET    /api/v1/families/{family_id}/recipes
POST   /api/v1/families/{family_id}/recipes
DELETE /api/v1/families/{family_id}/recipes/{recipe_id}
```

规则：

- 只有家庭成员能查看家庭菜谱。
- 只有菜谱 owner 能把自己的菜谱共享到家庭。
- 管理员或共享者可以移除家庭菜谱。

### 7.8 点菜/做菜任务 API

```text
GET   /api/v1/families/{family_id}/orders
POST  /api/v1/families/{family_id}/orders
GET   /api/v1/orders
GET   /api/v1/orders/{order_id}
POST  /api/v1/orders/{order_id}/accept
POST  /api/v1/orders/{order_id}/complete
POST  /api/v1/orders/{order_id}/cancel
PATCH /api/v1/orders/{order_id}/reminder
```

说明：

- GET /orders 返回与当前用户相关的点菜和做菜任务。
- GET /families/{family_id}/orders 返回当前家庭任务。
- accept 时可以传 reminder_time。
- complete 只允许做菜人操作。
- cancel 允许点菜人或管理员操作。

### 7.9 通知 API

```text
GET  /api/v1/notifications
POST /api/v1/notifications/{notification_id}/read
POST /api/v1/notifications/read-all
```

前端进入 APP 或清单页时拉取通知。首版使用简单轮询或页面刷新，不需要 WebSocket。

## 8. 页面结构设计

### 8.1 菜谱页

页面：

- 我的菜谱列表。
- 菜谱详情。
- 新建菜谱。
- 编辑菜谱。
- 共享到家庭弹窗/页面。

列表展示：

- 菜图。
- 菜名。
- 制作者。
- 是否已共享到家庭。
- 更新时间。

### 8.2 家庭页

未加入家庭：

- 空状态。
- 创建家庭按钮。
- 输入邀请码加入。

已加入家庭：

- 当前家庭切换。
- 家庭首页。
- 家庭成员列表。
- 家庭菜谱列表。
- 家庭菜谱详情。
- 点菜页面。
- 主动做菜页面。
- 家庭设置，管理员可见。

家庭首页展示：

- 家庭封面。
- 家庭成员。
- 最近点菜。
- 家庭菜谱入口。
- 点菜按钮。
- 主动做菜按钮。

### 8.3 清单页

页面：

- 我点的菜。
- 我要做的菜。
- 任务详情。
- 设置提醒弹窗。

任务卡片展示：

- 菜名。
- 图片。
- 餐次。
- 日期/时间。
- 点菜人。
- 做菜人。
- 状态。
- 操作按钮。

### 8.4 设置页

页面：

- 设置首页。
- 账户设置。
- 主题设置。
- 提醒管理。
- 帮助与反馈。
- 关于。

### 8.5 页面状态

所有主要页面都需要设计：

- 加载状态。
- 空状态。
- 错误状态。
- 未登录状态。
- 无权限状态。

示例：

- 菜谱为空：提示“还没有菜谱，添加你做过的第一道菜吧”。
- 家庭为空：提示“创建或加入一个家庭，开始一起点菜”。
- 清单为空：提示“暂时没有点菜任务”。
- 图片上传失败：允许重试。
- 通知权限未开启：提醒用户去系统设置开启。

## 9. MVP 里程碑

### 9.1 里程碑 1：项目基础架构

目标：

- 创建 React Native + Expo 前端项目。
- 创建 FastAPI 后端项目。
- 接入 MySQL。
- 配置基础环境变量。
- 建立 API 请求封装。
- 建立数据库迁移机制。
- 建立基础主题系统结构。

验收：

- 前端能启动到登录页。
- 后端能启动并返回健康检查。
- 数据库迁移能正常执行。
- 前端能访问后端 health API。

### 9.2 里程碑 2：注册登录与账户

目标：

- 注册。
- 登录。
- 登录态保持。
- 获取当前用户。
- 账户资料编辑。
- 用户设置表初始化。

验收：

- 用户可以注册。
- 用户可以登录。
- 关闭 APP 后再次打开仍能保持登录。
- 用户可以编辑昵称和头像。

### 9.3 里程碑 3：菜谱与图片

目标：

- 图片上传。
- 创建菜谱。
- 编辑菜谱。
- 删除菜谱。
- 菜谱列表。
- 菜谱详情。
- 菜谱步骤管理。

验收：

- 用户可以上传菜品图片。
- 用户可以创建带图片和步骤的菜谱。
- 用户只能看到和修改自己的菜谱。
- 删除菜谱后列表不再展示。

### 9.4 里程碑 4：家庭与共享菜谱

目标：

- 创建家庭。
- 邀请码加入家庭。
- 家庭成员列表。
- 管理员移除成员。
- 家庭菜谱共享。
- 家庭菜谱列表。

验收：

- 用户可以创建家庭。
- 另一个用户可以通过邀请码加入。
- 用户可以把自己的菜谱共享到家庭。
- 家庭成员可以看到共享菜谱。
- 普通成员不能移除其他成员。

### 9.5 里程碑 5：点菜、清单与通知

目标：

- 家庭成员点菜。
- 指派做菜人。
- 创建做菜任务。
- APP 内通知。
- 清单展示“我点的菜”和“我要做的菜”。
- 做菜人接受、完成、取消任务。

验收：

- 用户 A 可以点菜并指定用户 B 做菜。
- 用户 B 可以在清单看到任务。
- 用户 B 可以接受任务。
- 用户 A 可以看到任务状态变化。
- 用户 B 完成任务后任务状态变为已完成。

### 9.6 里程碑 6：本地提醒与基础设置

目标：

- 提醒管理。
- 接受任务时设置提醒时间。
- 注册本地通知。
- 主题基础设置。
- 家庭封面/主题配置预留。
- 帮助与关于页面。

验收：

- 用户可以设置默认提前提醒时间。
- 做菜人接受任务后可以设置提醒。
- 到提醒时间手机本地通知出现。
- 用户可以切换基础主题模式。
- 设置页内容完整。

## 10. 测试与验收标准

### 10.1 后端测试

使用 pytest。

重点测试：

- 注册登录。
- JWT 鉴权。
- 菜谱所有权校验。
- 家庭成员权限校验。
- 邀请码加入家庭。
- 共享菜谱权限。
- 点菜任务状态流转。
- 通知创建。
- 图片上传校验。

建议后端测试类型：

- 单元测试：service 层业务规则。
- API 测试：接口状态码和响应。
- 数据库测试：使用测试数据库。

### 10.2 前端测试

首版建议轻量测试，不追求复杂覆盖率。

重点测试：

- 登录表单校验。
- 菜谱表单校验。
- 点菜表单校验。
- API 请求封装。
- 关键状态组件。

可以使用：

- Jest。
- React Native Testing Library。

### 10.3 手动验收测试

每个里程碑结束做一次手动验收：

- 新用户注册登录。
- 创建菜谱。
- 上传照片。
- 创建家庭。
- 邀请用户加入。
- 共享菜谱。
- 点菜。
- 接收做菜。
- 设置提醒。
- 完成任务。

### 10.4 端到端核心验收场景

最终 MVP 通过以下完整场景：

1. 用户 A 注册并登录。
2. 用户 A 创建“番茄炒蛋”菜谱，上传照片并填写步骤。
3. 用户 A 创建“我的家”家庭，生成邀请码。
4. 用户 B 注册并登录。
5. 用户 B 通过邀请码加入“我的家”。
6. 用户 A 把“番茄炒蛋”共享到“我的家”。
7. 用户 B 在家庭菜谱中点“番茄炒蛋”。
8. 用户 B 指定用户 A 在晚餐制作，备注“少放盐”。
9. 用户 A 在通知和清单中看到任务。
10. 用户 A 接受任务并设置提前 30 分钟提醒。
11. 到提醒时间，用户 A 收到手机本地通知。
12. 用户 A 做完后标记完成。
13. 用户 B 看到任务已完成。

### 10.5 非功能验收标准

性能：

- 菜谱列表首屏加载在正常网络下 2 秒内完成。
- 单张图片上传限制在 5MB 内。
- 图片上传前前端压缩。
- API 常规响应目标低于 500ms，图片上传除外。

安全：

- 密码必须哈希存储。
- 图片上传限制 MIME 类型和大小。
- 所有家庭数据访问必须校验成员身份。
- 所有菜谱修改必须校验 owner。
- Token 不存储在普通明文文件中，优先使用 SecureStore。

可维护性：

- 前后端目录按 feature/module 分层。
- API schema 和 ORM model 分离。
- 图片存储通过接口抽象。
- 主题系统独立于具体页面。
- 数据库迁移脚本纳入版本管理。

兼容性：

- 首版优先支持 iOS 和 Android 的现代系统版本。
- Expo Go 可用于开发调试。
- 真机需要验证图片选择、上传、本地通知权限。

## 11. MVP 边界与后续演进

MVP 完成后应具备“可用的家庭点菜工具”能力，但不追求：

- 大规模用户并发。
- 复杂社交关系。
- 菜谱内容推荐。
- 商品化运营后台。
- 多端同步提醒。
- 精细化权限系统。
- 高级家庭空间装修。

后续版本可扩展：

- 购物清单。
- 食材库存。
- 菜谱广场。
- 家庭菜谱审核。
- 复杂成员角色。
- 系统推送通知。
- 微信/Apple 登录。
- 家庭空间装修。
- 菜谱导入/识别。
- 根据图片自动生成菜谱步骤。

## 12. 已确认决策

- 首版采用轻量 MVP，核心闭环优先。
- 通知方式采用 APP 内通知 + 本地提醒。
- 图片存储采用混合抽象层：开发本地存储，生产可切换对象存储。
- 家庭加入方式采用邀请码。
- 家庭权限采用简单权限：管理员 + 普通成员。
- 首版不做购物清单。
- 手机 APP 技术路线采用 React Native + Expo。
- 注册登录采用手机号/邮箱 + 密码。
