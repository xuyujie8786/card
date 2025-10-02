# 🚀 部署快速启动指南

> 10分钟完成从零到上线

---

## 📌 一、准备 Lightsail 实例（5分钟）

### 1. 创建实例

访问：https://lightsail.aws.amazon.com/

- **区域**: 新加坡 (ap-southeast-1)
- **系统**: Ubuntu 22.04 LTS  
- **套餐**: 2 GB RAM / $10/月
- **名称**: vcard-production

### 2. 配置网络

- 创建静态IP并绑定
- 开放端口：22（SSH）、8000（前端）、3001（后端）
- 下载SSH密钥到：`~/.ssh/LightsailDefaultKey-ap-southeast-1.pem`

```bash
# 设置密钥权限
chmod 400 ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem
```

---

## 🎯 二、一键部署（5分钟）

### 在本地Mac执行：

```bash
cd ~/vcard

# 替换为你的服务器IP
./deploy-to-lightsail-complete.sh 52.74.58.160
```

**脚本自动完成：**
- ✅ 上传代码
- ✅ 安装Docker
- ✅ 构建镜像
- ✅ 启动服务
- ✅ 初始化数据库

---

## ✅ 三、访问系统

### 打开浏览器：

```
http://你的服务器IP:8000
```

### 登录账号：

- **邮箱**: `admin@vcard.local`
- **密码**: `k7LjrKOcHsHFtOIZ`

**⚠️ 登录后立即修改密码！**

---

## 🛠️ 常用命令

### SSH登录：

```bash
ssh -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem ubuntu@你的服务器IP
```

### 查看日志：

```bash
cd /home/ubuntu/vcard
sudo docker compose -f docker-compose.production.yml logs -f
```

### 重启服务：

```bash
sudo docker compose -f docker-compose.production.yml restart
```

---

## 🔐 生成的密码

**请妥善保管！**

| 项目 | 密码 |
|------|------|
| 数据库 | `j4FcyddfkduL03q3FpT9yQO5blKoFC0b` |
| Redis | `jZPqLlVMqwZeZ8lByXRBQZu4AYZlLJr4` |
| 管理员 | `k7LjrKOcHsHFtOIZ` |

---

## ❓ 遇到问题？

查看详细文档：

```bash
cat LIGHTSAIL_DEPLOYMENT_GUIDE.md
```

---

**完成！** 🎉


