'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, BarChartIcon, PieChartIcon, Copy, Check } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

type ChartDataItem = {
  name: string;
  value: number;
  percentage: string;
  isOther?: boolean;
};

const Charts = dynamic(() => import('./charts'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg">
      <div className="animate-pulse text-muted-foreground">Loading visualization...</div>
    </div>
  )
})

type ChartType = 'bar' | 'pie'

const AnimatedText = () => {
  const [textIndex, setTextIndex] = useState(0)
  const texts = ["Upload", "Analyze", "Extract Results"]

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [texts.length])

  return (
    <div className="h-8 relative w-full flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={textIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute text-center text-xl font-semibold text-[#4E790B]"
        >
          {texts[textIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function Component() {
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<string[][]>([])
  const [selectedHeader, setSelectedHeader] = useState<string>('')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [copyCount, setCopyCount] = useState<number>(16)
  const [includeCaseNumber, setIncludeCaseNumber] = useState<boolean>(false)
  const [isCopied, setIsCopied] = useState(false)
  const fileRef = useRef<File | null>(null)
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      fileRef.current = file
      Papa.parse(file, {
        complete: (result) => {
          const parsedData = result.data as string[][]
          if (parsedData.length > 1) {
            setHeaders(parsedData[0])
            setData(parsedData.slice(1))
          }
        },
        header: false,
      })
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const generateChartData = () => {
    if (!selectedHeader || !data.length) return { chartData: [], allCategories: [] }

    const headerIndex = headers.indexOf(selectedHeader)
    const valueMap: { [key: string]: number } = {}

    data.forEach((row) => {
      const value = row[headerIndex]
      if (value) {
        valueMap[value] = (valueMap[value] || 0) + 1
      }
    })

    const total = Object.values(valueMap).reduce((sum, count) => sum + count, 0)
    
    const sortedData = Object.entries(valueMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(2)
      }))
      .sort((a, b) => b.value - a.value)

    const top3 = sortedData.slice(0, 3)
    const others = sortedData.slice(3)

    const chartData: ChartDataItem[] = [...top3]

    if (others.length > 0) {
      const othersPercentage = others.reduce((sum, item) => sum + parseFloat(item.percentage), 0)
      chartData.push({
        name: 'Others',
        value: othersPercentage,
        percentage: othersPercentage.toFixed(2),
        isOther: true
      })
    }

    return { chartData, allCategories: sortedData }
  }

  const { chartData, allCategories } = generateChartData()

  const colors = [
    '#C1F11D',
    '#9BC915',
    '#75A110',
    '#4E790B',
    '#E0E0E0' // Light gray for "Others"
  ]

  const copyAnalysis = async () => {
    try {
      if (!fileRef.current || !selectedHeader) {
        toast({
          title: "Error",
          description: "Please upload a CSV file and select a header first.",
          variant: "destructive",
        })
        return
      }

      const headerIndex = headers.indexOf(selectedHeader)
      const caseNumberIndex = headers.indexOf('Case Number')

      if (headerIndex === -1 || (includeCaseNumber && caseNumberIndex === -1)) {
        toast({
          title: "Error",
          description: "Selected header or Case Number not found in the CSV.",
          variant: "destructive",
        })
        return
      }

      const valueMap: { [key: string]: { count: number, cases: string[] } } = {}

      data.forEach((row) => {
        const value = row[headerIndex]
        const caseNumber = includeCaseNumber ? row[caseNumberIndex] : ''
        if (value) {
          if (!valueMap[value]) {
            valueMap[value] = { count: 0, cases: [] }
          }
          valueMap[value].count++
          if (includeCaseNumber && caseNumber) {
            valueMap[value].cases.push(caseNumber)
          }
        }
      })

      const sortedData = Object.entries(valueMap)
        .sort(([, a], [, b]) => b.count - a.count)

      // Fixed distribution for top 3
      const distribution = [4, 3, 2]
      const remainingCount = copyCount - 9 // 9 is sum of top 3 distribution

      // Get unique random entries for remaining categories
      if (remainingCount > 0 && sortedData.length > 3) {
        const otherCategories = sortedData.slice(3)
        const shuffled = [...otherCategories].sort(() => 0.5 - Math.random())
        const selectedOthers = shuffled.slice(0, remainingCount)
        
        selectedOthers.forEach(() => distribution.push(1))
      }

      let result = ''

      sortedData.forEach(([name, { cases }], index) => {
        if (distribution[index]) {
          const categoriesToInclude = cases.slice(0, distribution[index])
          if (includeCaseNumber) {
            categoriesToInclude.forEach(caseNum => {
              result += `${name}\t${caseNum}\n`
            })
          } else {
            result += `${name}\n`.repeat(distribution[index])
          }
        }
      })

      await navigator.clipboard.writeText(result.trim())
      setIsCopied(true)
      toast({
        title: "Success",
        description: `${copyCount} entries copied to clipboard. Ready to paste in spreadsheet.`,
      })

      // Reset copy indication after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (headers.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFEE9] flex flex-col">
        <div className="container mx-auto p-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex justify-center items-center w-full mb-8"
          >
            <Image
              src="https://i.ibb.co/6Wh6kqb/In-Drive-Logo-1.png"
              alt="inDrive Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </motion.div>
          
          <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <AnimatedText />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-xl"
            >
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-[#C1F11D] rounded-lg p-12 text-center cursor-pointer
                         transition-all duration-300 hover:bg-[#C1F11D]/10 bg-white/50 backdrop-blur-sm"
              >
                <input {...getInputProps()} />
                <motion.div 
                  className="transform transition-transform hover:scale-105 active:scale-95"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Upload className="mx-auto h-16 w-16 text-[#C1F11D] mb-4" />
                  <p className="text-lg mb-2">{isDragActive ? 'Drop here!' : 'Drag & drop CSV file'}</p>
                  <p className="text-sm text-gray-500">or click to select a file</p>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center text-sm text-gray-500"
            >
              Made with ❤️ by Ahmed Esslaoui
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFEE9]">
      <div className="container mx-auto p-4">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center items-center w-full mb-8"
        >
          <Image
            src="https://i.ibb.co/6Wh6kqb/In-Drive-Logo-1.png"
            alt="inDrive Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="mb-4 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">CSV Analyzer</CardTitle>
                <CardDescription>Upload and analyze your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className="border-2 border-dashed border-[#C1F11D] rounded-lg p-6 text-center cursor-pointer
                           transition-all duration-300 hover:bg-[#C1F11D]/10"
                >
                  <input {...getInputProps()} />
                  <div className="transform transition-transform hover:scale-105 active:scale-95">
                    <Upload className="mx-auto h-12 w-12 text-[#C1F11D]" />
                    <p className="mt-2">{isDragActive ? 'Drop here!' : 'Drag & drop CSV file'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {headers.length > 0 && (
              <Card className="bg-white/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Column</label>
                    <Select onValueChange={setSelectedHeader} value={selectedHeader}>
                      <SelectTrigger className="border-[#C1F11D] focus:ring-[#C1F11D]">
                        <SelectValue placeholder="Choose column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header || "default-value"}>
                            {header || "Unnamed Column"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chart Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={chartType === 'bar' ? 'default' : 'outline'}
                        onClick={() => setChartType('bar')}
                        className={`w-full ${
                          chartType === 'bar' ? 'bg-[#C1F11D] hover:bg-[#C1F11D]/90 text-black' :
                          'hover:bg-[#C1F11D]/10'
                        }`}
                      >
                        <BarChartIcon className="mr-2 h-4 w-4" />
                        Bar
                      </Button>
                      <Button
                        variant={chartType === 'pie' ? 'default' : 'outline'}
                        onClick={() => setChartType('pie')}
                        className={`w-full ${
                          chartType === 'pie' ?
                          'bg-[#C1F11D] hover:bg-[#C1F11D]/90 text-black' :
                          'hover:bg-[#C1F11D]/10'
                        }`}
                      >
                        <PieChartIcon className="mr-2 h-4 w-4" />
                        Pie
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Copy Analysis Options</label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={copyCount}
                        onChange={(e) => setCopyCount(Number(e.target.value))}
                        className="w-20"
                        min={1}
                      />
                      <span className="text-sm">entries</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="caseNumber"
                        checked={includeCaseNumber}
                        onCheckedChange={(checked) => setIncludeCaseNumber(checked as boolean)}
                      />
                      <label
                        htmlFor="caseNumber"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include Case Number
                      </label>
                    </div>
                    <Button 
                      onClick={copyAnalysis} 
                      className="w-full bg-[#C1F11D] hover:bg-[#C1F11D]/90 text-black relative"
                      disabled={isCopied}
                    >
                      {isCopied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedHeader && chartData.length > 0 && (
              <Card className="bg-white/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{selectedHeader} Analysis</CardTitle>
                  <CardDescription>
                    Distribution analysis using {chartType === 'bar' ? 'bar' : 'pie'} chart
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Charts
                    chartType={chartType}
                    chartData={chartData}
                    colors={colors}
                  />
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Category Breakdown:</h3>
                    <ul className="max-h-60 overflow-y-auto">
                      {allCategories.map((category, index) => (
                        <li key={index} className="mb-1">
                          <span style={{color: index < 3 ? colors[index] : colors[4]}}>■</span> {category.name}: {category.percentage}%
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}