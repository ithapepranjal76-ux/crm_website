# Nexa CRM (Django + MySQL)

Modern CRM with Landing page, glassmorphic Login, and role-based panels:

- **Admin Panel**
- **Sales Executive Panel**
- **Employee Panel**

## Quick start (SQLite for local demo)

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_users
python manage.py runserver 8080
```

Open: http://127.0.0.1:8080/  
(Use port `8080` if `8000` is already used by another app.)

### Demo logins

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Sales | `ravi` | `sales123` |
| Employee | `anjali` | `employee123` |

## MySQL setup

1. Create database:
   ```sql
   CREATE DATABASE nexacrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Copy `.env.example` to `.env` and set:
   ```
   USE_SQLITE=False
   DB_NAME=nexacrm
   DB_USER=root
   DB_PASSWORD=your_password
   DB_HOST=127.0.0.1
   DB_PORT=3306
   ```
3. Run migrate + seed again.

## URLs

- `/` — Landing
- `/login/` — Login
- `/admin-panel/` — Admin dashboard
- `/sales/` — Sales dashboard
- `/employee/` — Employee dashboard
