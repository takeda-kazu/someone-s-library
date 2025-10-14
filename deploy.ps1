# library_watch デプロイスクリプト
# 使い方: PowerShellで .\deploy.ps1 "コミットメッセージ" を実行

param(
    [string]$message = "Update: library_watch"
)

Write-Host "=== library_watch デプロイ開始 ===" -ForegroundColor Green

# 変更があるか確認
git status

# すべての変更をステージング
Write-Host "`n変更をステージング中..." -ForegroundColor Yellow
git add .

# コミット
Write-Host "`nコミット中..." -ForegroundColor Yellow
git commit -m $message

# プッシュ
Write-Host "`nGitHubにプッシュ中..." -ForegroundColor Yellow
git push origin main

Write-Host "`n=== デプロイ完了！ ===" -ForegroundColor Green
Write-Host "数分後に https://takeda-kazu.github.io/someone-s-library/ で確認できます" -ForegroundColor Cyan




