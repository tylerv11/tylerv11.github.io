import numpy as np
from operator import attrgetter

class Assignment:
    def __init__(self, antennas, schedule):
        self.antennas = antennas
        self.schedule = schedule
        self.fitness = self.calculate_fitness()

    def calculate_fitness(self):
        # Compute total distance travelled by all antennas
        return sum(np.sum(np.abs(np.diff(self.schedule[i]))) for i in range(len(self.schedule)))

def generate_random_assignment(antennas, num_satellites):
    # Create a random schedule for each antenna
    schedule = [np.random.choice(num_satellites, size=6, replace=False) for _ in range(antennas)]
    return Assignment(antennas, schedule)

def crossover(a1, a2):
    # Choose a random crossover point
    point = np.random.randint(len(a1.schedule))
    # Create a new schedule by combining parts of two parents' schedules
    new_schedule = a1.schedule[:point] + a2.schedule[point:]
    return Assignment(a1.antennas, new_schedule)

def mutate(a, num_satellites):
    # Choose a random antenna and a random new satellite
    antenna = np.random.randint(a.antennas)
    new_satellite = np.random.randint(num_satellites)
    # Replace one of the satellites in the antenna's schedule
    a.schedule[antenna][np.random.randint(6)] = new_satellite
    a.fitness = a.calculate_fitness()

def genetic_algorithm(antennas, num_satellites, population_size=100, generations=200):
    # Generate initial population
    population = [generate_random_assignment(antennas, num_satellites) for _ in range(population_size)]

    for _ in range(generations):
        # Generate new population
        new_population = [crossover(np.random.choice(population), np.random.choice(population)) for _ in range(population_size)]
        # Apply mutation
        for a in new_population:
            if np.random.rand() < 0.1:
                mutate(a, num_satellites)
        # Select the best individuals from the current and the new population
        population = sorted(population + new_population, key=attrgetter('fitness'))[:population_size]

    # Return the best assignment found
    return min(population, key=attrgetter('fitness'))

# Number of antennas and satellites
num_antennas = 5
num_satellites = 10

# Generate satellites' positions
satellites = [(i, np.random.rand(6, 2)) for i in range(num_satellites)]

best_assignment = genetic_algorithm(num_antennas, num_satellites)

print("Best assignment fitness: ", best_assignment.fitness)
for i in range(best_assignment.antennas):
    print(f"Antenna {i} schedule: {best_assignment.schedule[i]}")


print("\nThe best assignment found by the algorithm minimizes the total movement of all antennas.")
print(f"The total movement of the antennas in the best assignment is: {best_assignment.fitness}\n")

print("Here's how the antennas should be scheduled to achieve this minimum movement:")

for i in range(best_assignment.antennas):
    schedule = best_assignment.schedule[i]
    print(f"\nAntenna {i}:")

    for j in range(6):
        satellite_id = schedule[j]
        azimuth, elevation = satellites[satellite_id][1][j]
        print(f"At the {j*4}-th hour, point to satellite {satellite_id} at azimuth {azimuth:.2f} and elevation {elevation:.2f}.")