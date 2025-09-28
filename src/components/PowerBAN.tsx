import { useEffect, useState } from "react";
import { Trash2, Plus, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { CopyTooltipButton } from "./CopyTooltipButton";
import toast from 'react-hot-toast';
import QRCode from "react-qr-code";

interface Ticket {
  id: string
  numbers: number[]
}

export default function PowerBANLottery() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<Ticket[]>([]);
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [winAddress, setWinAddress] = useState("");
  const [previousWinAddress, setPreviousWinAddress] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [currentDraw, setCurrentDraw] = useState<{ drawDate: string; jackpot: number; ticketsBought: number; } | null>(null);
  const [previousDraw, setPreviousDraw] = useState<{
    drawDate: string;
    winningNumbers: number[];
    jackpot: number;
    winners: {
      winners: number;
      match4: number;
      match3: number;
      match2: number;
    };
  } | null>(null);

  const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;

  const addTicket = () => {
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      numbers: [],
    }
    setTickets([...tickets, newTicket]);
  }

  const removeTicket = (ticketId: string) => {
    setTickets(tickets.filter((ticket) => ticket.id !== ticketId));
  }

  const updateTicketNumbers = (ticketId: string, numbers: number[]) => {
    setTickets(tickets.map((ticket) => (ticket.id === ticketId ? { ...ticket, numbers } : ticket)));
  }

  const getNewUserId = async () => {
    if (!localStorage.getItem("powerban_userId")) {
      try {
        const response = await fetch(`${BASE_API_URL}/player`, { method: "GET" });
        
        if (!response.ok) {
          throw new Error("Failed to get new PowerBAN userId");
        }

        const data = await response.json();
        const userId = data.userId;

        localStorage.setItem("powerban_userId", userId);
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    }
  };

  const generateDepositAddress = async () => {
    const userId = localStorage.getItem("powerban_userId");
    if (!userId) {
      console.error("No userId found in localStorage.");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${BASE_API_URL}/player/deposit-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Failed to get deposit address");
      const data = await response.json();
      const address = data.depositAddress;
      setDepositAddress(address);
      localStorage.setItem("powerban_depositAddress", address);
      toast.success("Successfully generated deposit address");
    } catch (error) {
      console.error("Error generating deposit address:", error);
      toast.error("Could not generate deposit address. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDepositAddress = () => {
    const localDepositAddress = localStorage.getItem("powerban_depositAddress");
    if (localDepositAddress) {
      setDepositAddress(localDepositAddress);
    }
  };

  const getPreviousWinAddress = () => {
    const localWinAddress = localStorage.getItem("powerban_winAddress");
    if (localWinAddress) {
      setPreviousWinAddress(localWinAddress);
    }
  };

  const purchaseTickets = async () => {
    if (isPurchasing || !tickets || tickets.length === 0 || tickets.some((t) => t.numbers.length !== 5) || winAddress === "" || !depositAddress) {
      return;
    }

    const userId = localStorage.getItem("powerban_userId");
    if (!userId) {
      toast.error("User ID not found. Refresh the page.");
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await fetch(`${BASE_API_URL}/player/tickets/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tickets: tickets.map((t) => t.numbers),
          winAddress,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.log(err);
        throw new Error(err.error || "Purchase failed");
      }

      const data = await response.json();
      toast.success(`Successfully purchased ${data.tickets.length} ticket(s)!`);
      setTickets([]);
      getTodayTickets();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsPurchasing(false);
    }
  };

  const getTodayTickets = async () => {
    const userId = localStorage.getItem("powerban_userId");
    if (!userId) return;

    try {
      const response = await fetch(`${BASE_API_URL}/player/${userId}/tickets`);
      if (!response.ok) throw new Error("Failed to fetch today's tickets");

      const data = await response.json();

      const loadedTickets: Ticket[] = data.tickets.map((nums: number[], index: number) => ({
        id: `today-${index}`,
        numbers: nums
      }));

      setPurchasedTickets(loadedTickets);
    } catch (error) {
      console.error("Error fetching today's tickets:", error);
      toast.error("Could not load today's purchased tickets");
    }
  };

  async function fetchNextDraw() {
    const res = await fetch(`${BASE_API_URL}/draw/next-draw`);
    const { nextDraw } = await res.json();
    startCountdown(new Date(nextDraw));
  }

  async function fetchDraws() {
    try {
      // today's draw
      const todayRes = await fetch(`${BASE_API_URL}/draw/today`);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        if (todayData.success) {
          setCurrentDraw(todayData);
        }
      }

      // previous draw
      const prevRes = await fetch(`${BASE_API_URL}/draw/previous`);
      if (prevRes.ok) {
        const prevData = await prevRes.json();
        if (prevData.success) setPreviousDraw(prevData);
      }
    } catch (err) {
      console.error("Error fetching draw info:", err);
    }
  }

  function startCountdown(end: Date) {
    const interval = setInterval(() => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("Drawing now!");
        fetchNextDraw();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
  }

  const totalCost = tickets.length * 10;

  useEffect(() => {
    // Save previously used win address
    if (winAddress) {
      localStorage.setItem("powerban_winAddress", winAddress);
    }
  }, [winAddress]);

  useEffect(() => {
    getNewUserId();
    getDepositAddress();
    getPreviousWinAddress();
    getTodayTickets();
    fetchNextDraw();
    fetchDraws();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Status / issue banner */}
        {/* <div className="mb-6 rounded-md bg-red-100 border border-red-300 text-red-800 p-4 text-center shadow">
          There was an issue with the drawing which is actively being fixed. The winning numbers were: 2,7,17,27,34. There were no winners. 
        </div> */}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">🍌</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PowerBAN
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Pick 5 numbers and win big with BAN.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              🎯 Pick 5 Numbers
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              💰 10 BAN per ticket
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              🚀 Win BIG!
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8 items-stretch">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">Current Jackpot</CardTitle>
              <div className="text-4xl font-bold text-primary mb-1">
                {currentDraw ? `${currentDraw.jackpot?.toLocaleString()} BAN` : "Loading..."}
              </div>
              <CardDescription className="mb-4">
                Next draw in {timeLeft}
              </CardDescription>
              {typeof currentDraw?.ticketsBought === "number" && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    🎟️ {currentDraw.ticketsBought.toLocaleString()} tickets sold
                  </Badge>
                </div>
              )}
            </CardHeader>

            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 text-center items-stretch">
                <div className="flex flex-col items-center justify-center rounded-lg bg-white/60 p-3 shadow">
                  <span className="text-lg font-semibold text-primary">4 Numbers</span>
                  <span className="text-2xl font-bold text-emerald-600">1,000 BAN</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg bg-white/60 p-3 shadow">
                  <span className="text-lg font-semibold text-primary">3 Numbers</span>
                  <span className="text-2xl font-bold text-emerald-600">500 BAN</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg bg-white/60 p-3 shadow">
                  <span className="text-lg font-semibold text-primary">2 Numbers</span>
                  <span className="text-2xl font-bold text-emerald-600">100 BAN</span>
                </div>
              </div>
              <CardDescription className="text-center mt-4">Note: All prizes are split evenly amongst the winners.</CardDescription>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center h-full shadow-sm rounded-xl p-6">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold mb-1">Previous Draw Results</CardTitle>
              {previousDraw && (
                <CardDescription className="text-gray-500 text-sm">
                  Draw Date:&nbsp;
                  {new Date(`${previousDraw.drawDate}T23:59:00-05:00`).toLocaleString("en-US", {
                    timeZone: "America/Chicago",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="text-center space-y-5">
              {previousDraw?.winningNumbers ? (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-gray-600 text-sm tracking-wide uppercase">Winning Numbers</span>

                    <div className="flex flex-wrap justify-center gap-3">
                      {previousDraw.winningNumbers.map((num) => (
                        <div
                          key={num}
                          className="relative w-12 h-12 flex items-center justify-center font-bold text-white rounded-full
                                    bg-gradient-to-b from-green-700 to-green-900 shadow-lg ring-1 ring-green-800/40
                                    transition-transform duration-150 hover:scale-110"
                        >
                          <div className="absolute top-0 left-0 w-full h-full rounded-full
                                          bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-gray-700">
                    <p className="font-medium">
                      Jackpot Amount:{" "}
                      <span className="font-bold text-green-800">
                        {previousDraw?.jackpot?.toLocaleString() ?? 0} BAN
                      </span>
                    </p>
                    <div className="flex justify-center mt-8">
                      <div>
                        <div>🏆 Jackpot: <b>{previousDraw.winners?.winners ?? 0}</b></div>
                        <div>🥈 4 Numbers: <b>{previousDraw.winners?.match4 ?? 0}</b></div>
                        <div>🥉 3 Numbers: <b>{previousDraw.winners?.match3 ?? 0}</b></div>
                        <div>🏅 2 Numbers: <b>{previousDraw.winners?.match2 ?? 0}</b></div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500">No completed draw yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Your Tickets
                  <Button onClick={addTicket} size="sm" className="gap-2 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    Add Ticket
                  </Button>
                </CardTitle>
                <CardDescription>
                  Select 5 numbers from 1 to 35 for each ticket. Each ticket costs 10 BAN.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎫</span>
                    </div>
                    <p className="text-muted-foreground mb-4">No tickets yet</p>
                    <Button onClick={addTicket} variant="outline" className="cursor-pointer">
                      Add Your First Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
                    {tickets.map((ticket, index) => (
                      <TicketSelector
                        key={ticket.id}
                        ticket={ticket}
                        ticketNumber={index + 1}
                        onNumbersChange={(numbers) => updateTicketNumbers(ticket.id, numbers)}
                        onRemove={() => removeTicket(ticket.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchased Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Purchased Tickets</CardTitle>
                <CardDescription>Tickets you have already purchased for the current draw</CardDescription>
              </CardHeader>
              <CardContent>
                {purchasedTickets.length === 0 ? (
                  <p className="text-muted-foreground text-center">No purchased tickets yet</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchasedTickets.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className="
                          relative overflow-hidden
                          bg-gradient-to-br from-white to-gray-50
                          border-2 border-dashed border-gray-300
                          rounded-lg
                          p-5 flex flex-col items-center gap-4
                          shadow-md
                        "
                      >
                        {/* Perforation effect: circles cut from the sides */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border border-gray-300"></div>
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border border-gray-300"></div>

                        {/* Ticket Header */}
                        <div className="text-lg font-bold text-primary tracking-wider">
                          Ticket #{index + 1}
                        </div>

                        {/* Numbers row */}
                        <div className="flex flex-wrap justify-center gap-3">
                          {ticket.numbers.map((n) => (
                            <div
                              key={n}
                              className="
                                w-8 h-8 rounded-full
                                bg-primary text-primary-foreground
                                flex items-center justify-center
                                text-lg font-bold shadow
                              "
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Tickets ({tickets.length})</span>
                  <span>{tickets.length} × 10 BAN</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{totalCost} BAN</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
                <CardDescription>Send your payment to the wallet address below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wallet">
                    Deposit Address
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        This is a unique address generated just for you.  
                        Send exactly the total BAN amount here and then click Pay purchase your tickets.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  {depositAddress ? (
                    <>
                      <div className="flex gap-2 mt-1">
                        <Input id="wallet" value={depositAddress} readOnly className="font-mono text-sm" />
                        <CopyTooltipButton text={depositAddress} />
                      </div>

                      <div className="flex justify-center mt-4">
                        <QRCode
                          value={depositAddress}
                          size={120}
                          bgColor="transparent"
                        />
                      </div>
                    </>
                  ) : (
                    <Button
                      onClick={generateDepositAddress}
                      disabled={isGenerating}
                      className="mt-1 cursor-pointer w-full"
                    >
                      {isGenerating ? "Generating..." : "Generate Deposit Address"}
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="winAddress">
                    Win Address
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        Enter your own BAN wallet address here.  
                        Any winnings will be automatically sent to this address after the draw.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div>
                    <Input
                      id="winAddress"
                      placeholder="ban_1powerbanwin..."
                      className="font-mono text-sm"
                      onChange={(e) => setWinAddress(e.target.value)}
                      value={winAddress}
                    />
                  </div>

                  {previousWinAddress && previousWinAddress.length > 20 && (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                      <span>Previously used address:</span>
                      <div className="flex">
                        <img src={`https://monkey.banano.cc/api/v1/monkey/${previousWinAddress}`} width={40} />
                        <button
                          type="button"
                          onClick={() => setWinAddress(previousWinAddress)}
                          className="text-primary cursor-pointer hover:no-underline"
                        >
                          {`${previousWinAddress.slice(0, 10)}...${previousWinAddress.slice(-10)}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">How to Pay:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Generate a deposit address and copy it</li>
                    <li>
                      2. Send exactly <strong>{totalCost} BAN</strong>
                    </li>
                    <li>3. Enter a win address to receive your payment and buy the tickets</li>
                    <li>4. Your tickets will be confirmed automatically</li>
                    <li>5. Match all 5 numbers to hit the jackpot and win BIG!</li>
                  </ol>
                  {/* <p className="text-xs text-muted-foreground mt-2">
                    Note: For each 10 BAN ticket, 8 BAN rolls over into the next jackpot pool and 2 BAN is reserved for the operator fee.
                  </p> */}
                </div>

                <Button
                  className={`w-full cursor-pointer`}
                  size="lg"
                  disabled={isPurchasing || tickets.length === 0 || tickets.some((t) => t.numbers.length !== 5) || winAddress === "" || !depositAddress}
                  // disabled={true}
                  onClick={purchaseTickets}
                >
                  {isPurchasing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin w-5 h-5" />
                      Processing...
                    </div>
                  ) : (
                    `Pay ${totalCost} BAN`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TicketSelectorProps {
  ticket: Ticket
  ticketNumber: number
  onNumbersChange: (numbers: number[]) => void
  onRemove: () => void
}

function TicketSelector({ ticket, ticketNumber, onNumbersChange, onRemove }: TicketSelectorProps) {
  const toggleNumber = (number: number) => {
    const currentNumbers = ticket.numbers
    if (currentNumbers.includes(number)) {
      onNumbersChange(currentNumbers.filter((n) => n !== number))
    } else if (currentNumbers.length < 5) {
      onNumbersChange([...currentNumbers, number].sort((a, b) => a - b))
    }
  }

  const quickPick = () => {
    const numbers: number[] = []
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 35) + 1
      if (!numbers.includes(num)) {
        numbers.push(num)
      }
    }
    onNumbersChange(numbers.sort((a, b) => a - b))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ticket #{ticketNumber}</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={quickPick} variant="outline" size="sm" className="cursor-pointer">
              Quick Pick
            </Button>
            <Button onClick={onRemove} variant="ghost" size="sm" className="cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Selected:</span>
          {ticket.numbers.length === 0 ? (
            <span className="text-sm text-muted-foreground">None</span>
          ) : (
            <div className="flex gap-1">
              {ticket.numbers.map((num) => (
                <Badge key={num} variant="default" className="text-xs">
                  {num}
                </Badge>
              ))}
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{ticket.numbers.length}/5</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 border rounded-lg p-3">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => i + 1).map((number) => (
              <Button
                key={number}
                variant={ticket.numbers.includes(number) ? "default" : "outline"}
                size="sm"
                className="aspect-square p-0 text-xs h-8 w-8 cursor-pointer"
                onClick={() => toggleNumber(number)}
                disabled={!ticket.numbers.includes(number) && ticket.numbers.length >= 5}
              >
                {number}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
