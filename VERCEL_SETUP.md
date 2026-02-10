# Настройка переменных окружения на Vercel

## Проблема
Приложение работает локально, но на Vercel выдаёт ошибку "Missing Clerk Publishable Key"

## Решение

Вам нужно добавить переменную окружения `VITE_CLERK_PUBLISHABLE_KEY` в настройках вашего проекта на Vercel:

### Шаги:

1. Откройте ваш проект на Vercel: https://vercel.com/dashboard

2. Перейдите в **Settings** → **Environment Variables**

3. Добавьте новую переменную:
   - **Name**: `VITE_CLERK_PUBLISHABLE_KEY`
   - **Value**: `pk_test_YWNjZXB0ZWQtbWFtbWFsLTgwLmNsZXJrLmFjY291bnRzLmRldiQ`
   - **Environment**: Выберите все (Production, Preview, Development)

4. Нажмите **Save**

5. **Важно!** После добавления переменной нужно сделать **Redeploy**:
   - Перейдите на вкладку **Deployments**
   - Найдите последний деплой
   - Нажмите на три точки (⋯) справа
   - Выберите **Redeploy**
   - Подтвердите действие

### Альтернативный способ (через CLI):

Если у вас установлен Vercel CLI, выполните:

```bash
vercel env add VITE_CLERK_PUBLISHABLE_KEY
```

Затем введите значение: `pk_test_YWNjZXB0ZWQtbWFtbWFsLTgwLmNsZXJrLmFjY291bnRzLmRldiQ`

И сделайте redeploy:

```bash
vercel --prod
```

## Проверка

После redeploy откройте ваш сайт на Vercel - ошибка должна исчезнуть, и вы увидите кнопку "Sign In".

## Примечание

Переменные окружения с префиксом `VITE_` автоматически встраиваются в клиентский код при сборке Vite. Поэтому важно добавить именно `VITE_CLERK_PUBLISHABLE_KEY`, а не просто `CLERK_PUBLISHABLE_KEY`.
