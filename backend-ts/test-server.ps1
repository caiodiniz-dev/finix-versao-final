#!/usr/bin/env pwsh

# Script de teste do servidor Finix

Write-Host "╔════════════════════════════════════════╗"
Write-Host "║  Teste de Servidor Finix              ║"
Write-Host "║  $(Get-Date -Format 'HH:mm:ss')                          ║"
Write-Host "╚════════════════════════════════════════╝"

# 1. Iniciar o servidor
Write-Host "`n[1/3] Iniciando servidor..."
$job = Start-Job -ScriptBlock {
    cd 'c:\Users\Caio\Desktop\finixv1\backend-ts'
    node dist/server.js
}

# 2. Aguardar
Write-Host "[2/3] Aguardando inicialização (5 segundos)..."
Start-Sleep -Seconds 5

# 3. Testar endpoints
Write-Host "[3/3] Testando endpoints...`n"

$endpoints = @(
    @{ Method = "GET"; Path = "/health"; Description = "Health Check" },
    @{ Method = "GET"; Path = "/"; Description = "Info" }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000$($ep.Path)" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ $($ep.Method) $($ep.Path) - $($ep.Description)"
        Write-Host "   Status: $($response.StatusCode)"
        Write-Host "   Body: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Compress)`n"
    } catch {
        Write-Host "❌ $($ep.Method) $($ep.Path) - $($ep.Description)"
        Write-Host "   Erro: $($_.Exception.Message)`n"
    }
}

Write-Host "`n[SERVER] Servidor ainda está rodando"
Write-Host "[SERVER] Pressione Ctrl+C para parar"
Write-Host "[SERVER] Job ID: $($job.Id)"

# Aguardar job finalizar
Wait-Job -Job $job
