import { EventBusService } from "@medusajs/medusa"

type InjectedDependencies = {
  eventBusService: EventBusService
}

class TestSubscriber {
  constructor({ eventBusService }) {
    eventBusService.subscribe("user.password_reset", this.handle)
    console.log("INFO: TestSubscriber event set up for user.password_reset.")
  }

  handle = async (data) => {
    console.log("INFO: New Handler: " + data)
  }
}

export default TestSubscriber