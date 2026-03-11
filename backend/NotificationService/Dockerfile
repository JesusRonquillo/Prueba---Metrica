FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/NotificationService/src/EventPlatform.NotificationService.Worker/EventPlatform.NotificationService.Worker.csproj", "backend/NotificationService/src/EventPlatform.NotificationService.Worker/"]
COPY ["backend/NotificationService/src/EventPlatform.NotificationService.Infrastructure/EventPlatform.NotificationService.Infrastructure.csproj", "backend/NotificationService/src/EventPlatform.NotificationService.Infrastructure/"]
COPY ["backend/EventPlatform.Messaging.Contracts/EventPlatform.Messaging.Contracts.csproj", "backend/EventPlatform.Messaging.Contracts/"]

RUN dotnet restore "backend/NotificationService/src/EventPlatform.NotificationService.Worker/EventPlatform.NotificationService.Worker.csproj"

COPY backend/NotificationService/ backend/NotificationService/
COPY backend/EventPlatform.Messaging.Contracts/ backend/EventPlatform.Messaging.Contracts/

WORKDIR "/src/backend/NotificationService/src/EventPlatform.NotificationService.Worker"
RUN dotnet publish "EventPlatform.NotificationService.Worker.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "EventPlatform.NotificationService.Worker.dll"]

