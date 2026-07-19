# Sealos 部署 Cook Picture 后端

这个部署方案只上线 Cook Picture 的 FastAPI 后端和 SQLite 演示数据库。手机 APP 仍然是前端，部署完成后把手机 APP 的 API 地址指向线上后端的 `/api/v1`。

## 部署内容

- FastAPI 后端服务。
- SQLite 数据库文件：`/data/cook_picture.db`。
- 上传图片目录：`/data/uploads`。
- 启动时自动建表：`AUTO_CREATE_TABLES=true`。

## Sealos 应用配置

在 Sealos Cloud 新建应用，选择从当前项目的 Dockerfile 构建镜像，或先把项目推送到 Git 仓库后选择 GitHub/Gitee 仓库部署。

推荐配置：

| 配置项 | 值 |
| --- | --- |
| 应用类型 | Dockerfile / 自定义镜像构建 |
| 端口 | `8000` |
| 启动命令 | 使用镜像默认 `./start.sh` |
| 数据卷挂载 | `/data` |
| 健康检查路径 | `/api/v1/health` |

## 环境变量

必填：

```text
JWT_SECRET_KEY=<换成一段足够长的随机密钥>
```

推荐：

```text
ENVIRONMENT=development
DATABASE_URL=sqlite:////data/cook_picture.db
LOCAL_UPLOAD_DIR=/data/uploads
AUTO_CREATE_TABLES=true
PUBLIC_BASE_URL=https://你的-sealos-域名
```

如果手机 APP 使用线上域名访问后端，API base URL 应该是：

```text
https://你的-sealos-域名/api/v1
```

## 验证

部署完成后访问：

```text
https://你的-sealos-域名/api/v1/health
```

期望返回：

```json
{"status":"ok","app_name":"Cook Picture API","environment":"development"}
```

## 手机 APP 配置

本地开发时，手机 APP 默认会使用 Android 模拟器地址。发布或真机测试线上后端时，需要把 API 地址改成：

```text
https://你的-sealos-域名/api/v1
```

可以通过 `EXPO_PUBLIC_API_BASE_URL` 或 `mobile/app.json` 的 `expo.extra.apiBaseUrl` 配置。

## 注意事项

- 不要上传 `backend/.env`，里面可能包含本地密钥和邮箱配置。
- 必须挂载 `/data`，否则 SQLite 数据库和上传图片会在应用重建后丢失。
- 这是演示部署方案。若后续正式给多人长期使用，建议把 SQLite 换成托管 MySQL/PostgreSQL。
