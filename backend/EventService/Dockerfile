FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/EventService/src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj", "backend/EventService/src/EventPlatform.EventService.Api/"]
COPY ["backend/EventService/src/EventPlatform.EventService.Application/EventPlatform.EventService.Application.csproj", "backend/EventService/src/EventPlatform.EventService.Application/"]
COPY ["backend/EventService/src/EventPlatform.EventService.Infrastructure/EventPlatform.EventService.Infrastructure.csproj", "backend/EventService/src/EventPlatform.EventService.Infrastructure/"]
COPY ["backend/EventService/src/EventPlatform.EventService.Domain/EventPlatform.EventService.Domain.csproj", "backend/EventService/src/EventPlatform.EventService.Domain/"]
COPY ["backend/EventPlatform.Messaging.Contracts/EventPlatform.Messaging.Contracts.csproj", "backend/EventPlatform.Messaging.Contracts/"]

RUN dotnet restore "backend/EventService/src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj"

COPY backend/EventService/ backend/EventService/
COPY backend/EventPlatform.Messaging.Contracts/ backend/EventPlatform.Messaging.Contracts/

WORKDIR "/src/backend/EventService/src/EventPlatform.EventService.Api"
RUN dotnet publish "EventPlatform.EventService.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

# Necesario para el health check de ECS (curl -f http://localhost:8080/health/live)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "EventPlatform.EventService.Api.dll"]

