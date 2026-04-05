@echo off
echo ========================================
echo Atualizando Schema do Banco de Dados
echo ========================================
echo.

echo [1/2] Gerando Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERRO ao gerar Prisma Client!
    pause
    exit /b %errorlevel%
)
echo.

echo [2/2] Aplicando mudancas no banco de dados...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERRO ao aplicar mudancas no banco!
    pause
    exit /b %errorlevel%
)
echo.

echo ========================================
echo Concluido com sucesso!
echo ========================================
echo.
echo As tabelas PendingOrder e PendingOrderItem foram criadas.
echo Agora voce pode fazer commit e push.
echo.
pause
