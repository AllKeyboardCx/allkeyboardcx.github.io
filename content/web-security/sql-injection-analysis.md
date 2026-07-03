TITLE SQL注入漏洞深度解析
DATE 2026-06-30
SUMMARY 从基础到高级，全面分析SQL注入漏洞的原理、检测和利用...
TAG SQLi,数据库安全,Web漏洞

# SQL注入漏洞深度解析

## 漏洞原理

SQL注入是一种代码注入技术，攻击者通过在输入中插入恶意SQL语句来操纵数据库。

## 漏洞示例

### 危险代码

```php
$username = $_GET['username'];
$password = $_GET['password'];

$query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
$result = mysqli_query($conn, $query);
```

### 恶意输入

```
username: ' OR '1'='1
password: anything

结果: SELECT * FROM users WHERE username='' OR '1'='1' AND password='anything'
```

## 注入类型

### 1. 基于布尔的盲注

```sql
' AND (SELECT COUNT(*) FROM users) > 0 --
```

### 2. 基于时间的盲注

```sql
' AND SLEEP(5) --
```

### 3. UNION注入

```sql
' UNION SELECT username, password FROM users --
```

## 防御措施

1. **参数化查询（推荐）**
```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
$stmt->execute(['username' => $username]);
```

2. 输入验证
3. 最小权限原则
4. WAF防护