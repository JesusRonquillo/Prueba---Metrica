using System;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;

namespace EventPlatform.EventService.Domain.Tests;

public class EventsEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public EventsEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
        });
    }

    [Fact(Skip = "Requiere Postgres, Redis y RabbitMQ en ejecución")]
    public async Task PostEvents_Should_ReturnCreated_When_RequestIsValid()
    {
        var client = _factory.CreateClient();

        var tokenResponse = await client.PostAsJsonAsync("/auth/token", new { userName = "demo", role = "Admin" });
        tokenResponse.EnsureSuccessStatusCode();

        var tokenPayload = await tokenResponse.Content.ReadFromJsonAsync<TokenResponse>();
        Assert.NotNull(tokenPayload);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", tokenPayload!.Token);

        var request = new
        {
            name = "Evento integración",
            date = DateTimeOffset.UtcNow.AddDays(7),
            location = "Lima",
            zones = new[]
            {
                new { name = "General", price = 50m, capacity = 100 }
            }
        };

        var response = await client.PostAsJsonAsync("/events", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<CreatedResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.Id);
    }

    private sealed record TokenResponse(string Token, DateTimeOffset Expires);
    private sealed record CreatedResponse(Guid Id);
}

